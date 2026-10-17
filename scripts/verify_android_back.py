"""Run genuine Android Back regression checks on an emulator only.

Usage from the repository root:
    python scripts/verify_android_back.py --device emulator-5554

The integration fixture overrides train data and browser preferences. It makes
no RailRadar requests. Flutter builds its separate .debug application. This
harness sends real Android KEYCODE_BACK events and committed edge gestures;
it does not treat framework-only simulated pops as Android device coverage.
The original navigation overlays are restored even if the test fails.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import queue
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
import uuid


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "apps" / "mobile" / "flutter_app"
OVERLAY = re.compile(
    r"^\[([ x])\]\s+(com\.android\.internal\.systemui\.navbar\.[\w.]+)$",
    re.MULTILINE,
)
STAGES = [
    "DETAILS_KEY",
    "SAVED_KEY",
    "DIALOG_KEY",
    "DETAILS_GESTURE",
    "SAVED_GESTURE",
    "FINISHED",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--device", required=True, help="Emulator adb serial")
    parser.add_argument("--adb", default=shutil.which("adb"))
    parser.add_argument("--flutter", default=shutil.which("flutter"))
    parser.add_argument("--timeout", type=int, default=900)
    args = parser.parse_args()
    if not re.fullmatch(r"emulator-\d+", args.device):
        parser.error("Only emulator-* devices are permitted; no physical phones.")
    if not args.adb or not args.flutter:
        parser.error("adb and flutter must be on PATH or passed explicitly.")
    if args.timeout < 60:
        parser.error("--timeout must allow at least 60 seconds.")

    def adb(*parts: str, timeout: int = 20, binary: bool = False):
        return subprocess.run(
            [args.adb, "-s", args.device, *parts],
            check=True,
            capture_output=True,
            text=not binary,
            encoding=None if binary else "utf-8",
            errors=None if binary else "replace",
            timeout=timeout,
        ).stdout

    if adb("get-state").strip() != "device":
        raise RuntimeError("The selected emulator is not ready.")
    if adb("shell", "getprop", "ro.kernel.qemu").strip() != "1":
        raise RuntimeError("Android does not report this device as an emulator.")
    original = {
        name: state == "x"
        for state, name in OVERLAY.findall(
            adb("shell", "cmd", "overlay", "list", "--user", "0")
        )
    }
    gesture_overlay = next(
        (name for name in original if name.endswith(".gestural")),
        next((name for name in original if ".gestural" in name), None),
    )
    if not gesture_overlay:
        raise RuntimeError("No Android gesture-navigation overlay was found.")

    token = uuid.uuid4().hex[:12]
    output = APP / "build" / "navigation-back" / token
    output.mkdir(parents=True, exist_ok=False)
    print(f"Android navigation evidence: {output}", flush=True)
    events: queue.Queue[str] = queue.Queue()
    logcat = None
    test = None
    thread = None
    test_thread = None
    completed: list[str] = []

    def stop_owned_process(process: subprocess.Popen | None) -> None:
        if process is None or process.poll() is not None:
            return
        if os.name == "nt":
            # Stop only this explicitly created child and its build subprocesses.
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                capture_output=True,
                check=False,
                timeout=20,
            )
        else:
            os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)

    try:
        adb(
            "shell", "cmd", "overlay", "enable-exclusive", "--user", "0",
            "--category", gesture_overlay,
        )
        effective = adb("shell", "cmd", "overlay", "list", "--user", "0")
        if not any(
            state == "x" and name == gesture_overlay
            for state, name in OVERLAY.findall(effective)
        ):
            raise RuntimeError("Gesture navigation did not become active.")
        # Let SystemUI finish changing navigation mode before launching Flutter.
        time.sleep(1)
        dimensions = re.findall(r"(?:Physical|Override) size:\s*(\d+)x(\d+)",
                                adb("shell", "wm", "size"))
        if not dimensions:
            raise RuntimeError("Could not read the emulator display size.")
        width, height = map(int, dimensions[-1])
        if width < 240 or height < 320:
            raise RuntimeError("Unexpected emulator dimensions.")
        creation = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} \
            if os.name == "nt" else {"start_new_session": True}
        logcat = subprocess.Popen(
            [args.adb, "-s", args.device, "logcat", "-v", "brief", "-T", "1",
             "flutter:I", "*:S"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            **creation,
        )

        def collect_logcat() -> None:
            assert logcat is not None and logcat.stdout is not None
            with (output / "android-logcat.log").open("w", encoding="utf-8") as log:
                for line in logcat.stdout:
                    log.write(line)
                    log.flush()

        thread = threading.Thread(target=collect_logcat, daemon=True)
        thread.start()
        test = subprocess.Popen(
            [args.flutter, "test", "integration_test/navigation_back_flow_test.dart",
             "--no-pub", "--reporter", "expanded", "-d", args.device,
             f"--dart-define=NAV_RUN_TOKEN={token}"],
            cwd=APP,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            **creation,
        )

        def collect_test_output() -> None:
            # flutter test forwards Dart print output through its VM service,
            # so stage markers are not guaranteed to reach Android logcat.
            assert test is not None and test.stdout is not None
            with (output / "flutter-test.log").open("w", encoding="utf-8") as log:
                for line in test.stdout:
                    log.write(line)
                    log.flush()
                    events.put(line)

        test_thread = threading.Thread(target=collect_test_output, daemon=True)
        test_thread.start()
        pattern = re.compile(rf"ETAERNAL_NAV:{re.escape(token)}:([A-Z_]+)")
        deadline = time.monotonic() + args.timeout
        while time.monotonic() < deadline:
            try:
                line = events.get(timeout=0.25)
            except queue.Empty:
                if test.poll() is not None:
                    break
                if logcat.poll() is not None:
                    raise RuntimeError("The adb logcat connection ended.")
                continue
            marker = pattern.search(line)
            if marker is None or marker[1] in completed:
                continue
            stage = marker[1]
            expected = STAGES[len(completed)] if len(completed) < len(STAGES) else None
            if stage != expected:
                raise RuntimeError(f"Unexpected stage {stage}; expected {expected}.")
            completed.append(stage)
            print(f"{stage}: Android device input", flush=True)
            if stage.endswith("_KEY"):
                ime = adb("shell", "dumpsys", "input_method")
                (output / f"{stage.lower()}-ime.log").write_text(ime, encoding="utf-8")
                shown = re.search(r"\bmInputShown=(true|false)", ime)
                if shown and shown[1] == "true":
                    raise RuntimeError(f"Keyboard is still visible before {stage}; "
                                       "route Back must not be confused with IME dismissal.")
                adb("shell", "input", "keyevent", "4")
            elif stage.endswith("_GESTURE"):
                adb("shell", "input", "touchscreen", "swipe", "2", str(height // 2),
                    str(width // 2), str(height // 2), "200", timeout=60)
            # Retain an actual device screenshot after each handled event.
            if stage != "FINISHED":
                time.sleep(0.4)
            (output / f"{len(completed):02d}-{stage.lower()}.png").write_bytes(
                adb("exec-out", "screencap", "-p", binary=True)
            )
        else:
            raise TimeoutError(f"Navigation test exceeded {args.timeout} seconds.")
        remaining = max(1, int(deadline - time.monotonic()))
        result = test.wait(timeout=remaining)
        if result != 0 or completed != STAGES:
            raise RuntimeError(
                f"Flutter exit={result}; completed={completed}. "
                f"See {output / 'flutter-test.log'}."
            )
        print("PASS: real Android Back key, committed edge gestures, AppBar Back, "
              "dialog dismissal, and preserved Home input.", flush=True)
        return 0
    finally:
        stop_owned_process(test)
        stop_owned_process(logcat)
        if thread is not None:
            thread.join(timeout=5)
        if test_thread is not None:
            test_thread.join(timeout=5)
        restore_errors = []
        for name, enabled in original.items():
            try:
                adb("shell", "cmd", "overlay", "enable" if enabled else "disable",
                    "--user", "0", name)
            except (subprocess.SubprocessError, OSError) as error:
                restore_errors.append(f"{name}: {error}")
        if restore_errors:
            raise RuntimeError("Could not restore original navigation overlays: "
                               + "; ".join(restore_errors))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, TimeoutError, subprocess.SubprocessError) as error:
        print(f"Android navigation verification failed: {error}", file=sys.stderr)
        raise SystemExit(1)
