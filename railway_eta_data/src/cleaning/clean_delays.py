"""
clean_delays.py
Cleaning pipeline for Railpull delays.json.

Structure:
  { "updatedAt": <unix_ts>, "source": "ntes-station-boards",
    "trains": { "<number>": {"d": <minutes>} | {"c": 1} } }

444 train entries from the live snapshot.
Known quirks (from README + profiling):
  - delay values can be "stale garbage" — Railpull already caps at 720 min (12h).
  - Any entry with "c": 1 is cancelled; no delay value.
"""
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.cleaning.decision_log import DecisionLog

# Max believable delay in minutes (aligned with Railpull's own cap)
MAX_DELAY_MIN = 720


def clean_delays(
    input_path: str,
    output_path: str,
    valid_train_numbers: set,
    log: DecisionLog,
) -> list:
    """
    Load, validate, and write cleaned delay records as a flat list.
    Returns list of dicts: {train_number, delay_min, cancelled, snapshot_ts}.
    """
    print("Loading delays.json …")
    with open(input_path, encoding="utf-8") as f:
        raw = json.load(f)

    snapshot_ts = raw.get("updatedAt")
    snapshot_iso = (
        datetime.utcfromtimestamp(snapshot_ts).isoformat() + "Z"
        if snapshot_ts else "unknown"
    )
    trains_raw = raw.get("trains", {})
    print(f"  {len(trains_raw):,} train delay entries (snapshot: {snapshot_iso}).")

    cleaned = []
    for train_num, payload in trains_raw.items():
        rid = f"delays#{train_num}"
        cancelled = bool(payload.get("c"))
        delay_min = payload.get("d")

        # ── Validate train number against reference ──
        if valid_train_numbers and train_num not in valid_train_numbers:
            log.add(
                record_id=rid,
                source="delays",
                issue_type="UNKNOWN_TRAIN_NUMBER",
                decision="INVESTIGATE",
                reason=f"Train {train_num!r} not found in Datameet trains reference; "
                       "may be a new/unlisted service",
                original_value=train_num,
            )

        # ── Validate delay value ──
        if not cancelled and delay_min is not None:
            try:
                d = int(delay_min)
            except (ValueError, TypeError):
                log.add(
                    record_id=rid,
                    source="delays",
                    issue_type="BAD_DELAY_VALUE",
                    decision="INVESTIGATE",
                    reason=f"Non-integer delay value: {delay_min!r}",
                    original_value=str(delay_min),
                )
                d = None

            if d is not None and d > MAX_DELAY_MIN:
                log.add(
                    record_id=rid,
                    source="delays",
                    issue_type="IMPLAUSIBLE_DELAY",
                    decision="INVESTIGATE",
                    reason=f"Delay {d} min exceeds 12h cap; possible stale data",
                    original_value=str(d),
                )
            elif d is not None and d < 0:
                log.add(
                    record_id=rid,
                    source="delays",
                    issue_type="NEGATIVE_DELAY",
                    decision="INVESTIGATE",
                    reason=f"Negative delay {d} min is implausible",
                    original_value=str(d),
                )
        else:
            d = None

        out = {
            "train_number": train_num,
            "delay_min": d,
            "cancelled": cancelled,
            "snapshot_ts": snapshot_iso,
        }
        cleaned.append(out)

    # ── Write output ──
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)
    print(f"  Cleaned delays -> {output_path} ({len(cleaned):,} records).")

    return cleaned
