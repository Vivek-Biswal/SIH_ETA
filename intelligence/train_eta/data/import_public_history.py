"""Import a bounded, pinned sample of public station-event history.

This downloads CSV data only, never executes remote code, and makes no railway
provider requests. Unreported rows and ambiguous conflicting observations are
excluded. Raw files and canonical events remain in Git-ignored data directories.
"""
from __future__ import annotations

import argparse
from collections import Counter
import csv
from datetime import date, datetime, timedelta, timezone
import hashlib
import io
import json
import math
from pathlib import Path
import re
from urllib.request import Request, urlopen


REPOSITORY = "yadavsaurabh/indian-railways-runs"
REVISION = "d131017ee61b65681a1908025b93813169e8fb8f"
ROOT = Path(__file__).resolve().parents[3]
IST = timezone(timedelta(hours=5, minutes=30))
MAX_FILE_BYTES = 25 * 1024 * 1024
REQUIRED = {
    "date", "train_no", "station_code", "seq", "reported", "reported_at",
    "departed", "sch_arrival", "sch_arrival_date", "sch_departure",
    "sch_departure_date", "act_arrival", "act_arrival_date", "act_departure",
    "act_departure_date", "distance_km", "train_type",
}


def timestamp(row: dict, prefix: str) -> datetime | None:
    value, day = row.get(prefix, "").strip(), row.get(prefix + "_date", "").strip()
    if not value or not day:
        return None
    try:
        return datetime.strptime(day + " " + value, "%d %b %Y %H:%M").replace(tzinfo=IST)
    except ValueError:
        return None


def as_iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def canonical_event(row: dict, train: str, revision: str, counts: Counter) -> dict | None:
    """Retain only source-reported, date-aligned station arrivals."""
    if row.get("reported") != "1":
        counts["unreported"] += 1
        return None
    try:
        journey = date.fromisoformat(row["date"])
        number = str(row["train_no"]).strip().zfill(5)
        station = row["station_code"].strip().upper()
        seq = float(row["seq"])
        reported = datetime.fromisoformat(row["reported_at"])
        if number != train or not re.fullmatch(r"[A-Z0-9]{1,10}", station):
            raise ValueError("Invalid identity")
        if not math.isfinite(seq) or seq != int(seq) or not 0 <= seq <= 2000:
            raise ValueError("Invalid sequence")
        if reported.tzinfo is None:
            raise ValueError("Undated observation")
    except (KeyError, TypeError, ValueError, OverflowError):
        counts["invalid_identity_or_report_time"] += 1
        return None
    scheduled = timestamp(row, "sch_arrival")
    actual = timestamp(row, "act_arrival")
    if scheduled is None or actual is None or actual > reported:
        counts["missing_or_unconfirmed_arrival"] += 1
        return None
    # A journey date denotes origin departure, never a local stop's calendar day.
    offset = (scheduled.date() - journey).days
    if not 0 <= offset <= 10 or abs((actual - scheduled).total_seconds()) > 7 * 86400:
        counts["invalid_event_dates"] += 1
        return None
    departure = timestamp(row, "act_departure")
    departure_confirmed = row.get("departed") == "1" and departure is not None and departure >= actual
    if not departure_confirmed:
        departure = None
    distance = None
    try:
        candidate = float(row.get("distance_km", ""))
        if math.isfinite(candidate) and 0 <= candidate <= 10000:
            distance = candidate
    except (TypeError, ValueError):
        pass
    return {
        "train_number": train,
        "journey_date": journey.isoformat(),
        "station_code": station,
        "sequence": int(seq),
        "scheduled_arrival": as_iso(scheduled),
        "scheduled_departure": as_iso(timestamp(row, "sch_departure")),
        "actual_arrival": as_iso(actual),
        "actual_departure": as_iso(departure),
        "distance_km": distance,
        "reported_at": reported.isoformat(),
        "arrival_confirmed": True,
        "departure_confirmed": bool(departure_confirmed),
        "train_type": row.get("train_type", "").strip() or None,
        "source": f"huggingface:{REPOSITORY}@{revision}",
    }


def normalize_csv(content: bytes, train: str, revision: str = REVISION) -> tuple[list[dict], dict]:
    counts = Counter()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    missing = REQUIRED - set(reader.fieldnames or [])
    if missing:
        raise ValueError(f"CSV lacks required columns: {sorted(missing)}")
    events: dict[tuple, dict] = {}
    conflicts: set[tuple] = set()
    for row in reader:
        counts["raw_rows"] += 1
        event = canonical_event(row, train, revision, counts)
        if event is None:
            continue
        key = (event["train_number"], event["journey_date"], event["sequence"], event["station_code"])
        if key in conflicts:
            counts["conflicting_rows"] += 1
            continue
        previous = events.get(key)
        if previous is None:
            events[key] = event
            continue
        counts["duplicate_rows"] += 1
        # Do not choose an arbitrary arrival from conflicting source records.
        time_fields = ("actual_arrival", "actual_departure", "scheduled_arrival", "scheduled_departure")
        if any(previous[field] is not None and event[field] is not None and previous[field] != event[field]
               for field in time_fields):
            conflicts.add(key)
            del events[key]
            counts["conflicting_rows"] += 2
            continue
        for field in ("actual_departure", "scheduled_departure", "distance_km", "train_type"):
            if previous[field] is None:
                previous[field] = event[field]
        previous["departure_confirmed"] = previous["departure_confirmed"] or event["departure_confirmed"]
        # Keeping the later report conservatively avoids pretending early availability.
        if datetime.fromisoformat(event["reported_at"]) > datetime.fromisoformat(previous["reported_at"]):
            previous["reported_at"] = event["reported_at"]
    result = sorted(events.values(), key=lambda e: (e["journey_date"], e["sequence"], e["station_code"]))
    counts["conflicting_event_keys"] = len(conflicts)
    counts["retained_events"] = len(result)
    journeys = {e["journey_date"] for e in result}
    return result, {
        "counts": dict(counts), "journeys": len(journeys),
        "journey_date_start": min(journeys) if journeys else None,
        "journey_date_end": max(journeys) if journeys else None,
        "stations": len({e["station_code"] for e in result}),
    }


def read_public_file(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "Etaernal-Research-Importer/1.0"})
    with urlopen(request, timeout=60) as response:
        if int(response.headers.get("Content-Length", "0")) > MAX_FILE_BYTES:
            raise ValueError("File exceeds bounded import size")
        content = response.read(MAX_FILE_BYTES + 1)
    if len(content) > MAX_FILE_BYTES:
        raise ValueError("File exceeds bounded import size")
    return content


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trains", nargs="+", default=["12423", "12303", "12624"])
    parser.add_argument("--revision", default=REVISION)
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data/raw/eta_public_history")
    parser.add_argument("--output", type=Path, default=ROOT / "data/processed/eta_stop_events.jsonl")
    parser.add_argument("--manifest", type=Path, default=ROOT / "intelligence/train_eta/reports/source_manifest.json")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-f0-9]{40}", args.revision):
        parser.error("An immutable full 40-character commit is required")
    trains = list(dict.fromkeys(args.trains))
    if not 1 <= len(trains) <= 20 or any(not re.fullmatch(r"\d{5}", t) for t in trains):
        parser.error("Provide 1 to 20 five-digit train numbers")
    raw_dir = args.raw_dir / args.revision
    raw_dir.mkdir(parents=True, exist_ok=True)
    events, files = [], []
    for train in trains:
        folder = "trains" if int(train[0]) < 5 else "trains_1"
        url = f"https://huggingface.co/datasets/{REPOSITORY}/resolve/{args.revision}/{folder}/{train}.csv"
        path = raw_dir / f"{train}.csv"
        content = path.read_bytes() if path.exists() else read_public_file(url)
        if len(content) > MAX_FILE_BYTES:
            raise ValueError("Cached file exceeds import bound")
        rows, audit = normalize_csv(content, train, args.revision)
        if not path.exists():
            path.write_bytes(content)
        events.extend(rows)
        files.append({"train_number": train, "url": url, "local_path": str(path.relative_to(ROOT)),
                      "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(), **audit})
        print(json.dumps({"train_number": train, **audit}), flush=True)
    events.sort(key=lambda e: (e["journey_date"], e["train_number"], e["sequence"], e["station_code"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as handle:
        for event in events:
            handle.write(json.dumps(event, allow_nan=False, separators=(",", ":")) + "\n")
    manifest = {
        "repository": REPOSITORY, "revision": args.revision,
        "dataset_card": f"https://huggingface.co/datasets/{REPOSITORY}/blob/{args.revision}/README.md",
        "declared_license": "GPL-3.0",
        "publisher": "yadavsaurabh (independent third-party collection)",
        "publisher_described_origin": "Public live_status cache behind whereismytrain.in, one request per train per day",
        "imported_at": datetime.now(timezone.utc).isoformat(), "files": files,
        "canonical_events": len(events), "output_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
        "limitations": [
            "Third-party source records, not independently audited official railway ground truth.",
            "A bounded three-train pilot by default; does not establish nationwide accuracy.",
            "Incomplete and uneven reporting; timetable and operating conditions changed over the covered years.",
            "Source delay fields clip early arrivals; training must derive labels from dated actual and scheduled timestamps.",
            "Reported time may describe arrival while departure was populated later. Departure features require a later as-of landmark.",
            "Coordinates identify stations. Continuous GPS, speed, signal waits, weather and track occupancy are unavailable.",
            "Raw data and canonical event records are excluded from source control; this manifest preserves attribution and hashes.",
        ],
    }
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "manifest": str(args.manifest), "events": len(events)}), flush=True)


if __name__ == "__main__":
    main()
