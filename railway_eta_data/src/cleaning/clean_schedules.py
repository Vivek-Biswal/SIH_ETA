"""
clean_schedules.py
Cleaning pipeline for Datameet schedules.json (417,080 stop records).

Fields:  arrival | day | train_name | station_name | station_code |
         id | train_number | departure

Known raw-data quirks (from profiling):
  - arrival/departure can be string "None" -> valid sentinel for terminal stops.
  - day is None for 22,561 records.
  - Time format is HH:MM:SS; hours > 24 are uncommon but possible.
"""
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.cleaning.decision_log import DecisionLog
from src.cleaning.validators import parse_time, is_null_time, validate_station_code


# ─── helpers ─────────────────────────────────────────────────────────────────

def _rid(record: dict) -> str:
    return f"schedules#{record.get('id', 'unknown')}"


def _check_missing(record: dict, log: DecisionLog):
    """Flag genuinely missing (not sentinel) required fields."""
    required = ["station_code", "train_number", "id"]
    for field in required:
        val = record.get(field)
        if val is None or str(val).strip() == "":
            log.add(
                record_id=_rid(record),
                source="schedules",
                issue_type="MISSING_VALUE",
                decision="INVESTIGATE",
                reason=f"Required field '{field}' is missing",
                original_value=str(val),
            )


def _check_times(record: dict, log: DecisionLog) -> dict:
    """
    Validate arrival and departure.
    'None' strings are valid sentinels for first/last stops (no arrival at origin).
    Returns dict of corrected values (or empty if nothing changed).
    """
    corrections = {}
    for field in ("arrival", "departure"):
        raw = record.get(field)
        if is_null_time(raw):
            # Sentinel is valid; departure should be present at most stops
            if field == "departure" and is_null_time(raw):
                # Terminal stop: departure being None is fine
                pass
            continue

        ok, parsed, msg = parse_time(raw)
        if not ok:
            log.add(
                record_id=_rid(record),
                source="schedules",
                issue_type="BAD_TIME",
                decision="INVESTIGATE",
                reason=f"Unparseable {field}: {msg}",
                original_value=str(raw),
            )
        elif msg:  # Valid but needed normalisation (e.g. 24:00 -> 00:00)
            canonical = parsed.strftime("%H:%M:%S")
            corrections[field] = canonical
            log.add(
                record_id=_rid(record),
                source="schedules",
                issue_type="TIME_NORMALISED",
                decision="MAP",
                reason=msg,
                original_value=str(raw),
                corrected_value=canonical,
            )
    return corrections


def _check_day(record: dict, log: DecisionLog):
    """day=None means Datameet didn't record the journey-day offset."""
    if record.get("day") is None:
        log.add(
            record_id=_rid(record),
            source="schedules",
            issue_type="MISSING_VALUE",
            decision="INVESTIGATE",
            reason="'day' field is None — journey-day offset unknown; "
                   "cannot determine midnight crossings without it",
            original_value="None",
        )


def _check_station_code(record: dict, valid_codes: set, log: DecisionLog):
    code = record.get("station_code", "")
    decision, reason = validate_station_code(code, valid_codes)
    if decision != "KEEP":
        log.add(
            record_id=_rid(record),
            source="schedules",
            issue_type="UNKNOWN_STATION_CODE",
            decision=decision,
            reason=reason,
            original_value=code,
        )


# ─── duplicate detection ──────────────────────────────────────────────────────

def _find_exact_duplicates(records: list, log: DecisionLog) -> set:
    """
    Exact duplicates: same (train_number, station_code, departure) tuple.
    Returns set of record ids to exclude.
    """
    seen = {}
    exclude_ids = set()
    for r in records:
        key = (r.get("train_number"), r.get("station_code"), r.get("departure"))
        rid = r.get("id")
        if key in seen:
            log.add(
                record_id=f"schedules#{rid}",
                source="schedules",
                issue_type="EXACT_DUPLICATE",
                decision="EXCLUDE",
                reason=f"Exact duplicate of record id={seen[key]}: "
                       f"same (train_number, station_code, departure)",
                original_value=str(key),
            )
            exclude_ids.add(rid)
        else:
            seen[key] = rid
    return exclude_ids


# ─── main entry point ─────────────────────────────────────────────────────────

def clean_schedules(
    input_path: str,
    output_path: str,
    valid_station_codes: set,
    log: DecisionLog,
) -> list:
    """
    Load, validate, and write cleaned schedules.
    Raw file is never modified.
    Returns the cleaned record list.
    """
    print("Loading schedules.json …")
    with open(input_path, encoding="utf-8") as f:
        records = json.load(f)
    print(f"  {len(records):,} records loaded.")

    # ── 1. Duplicate detection ──
    print("Running duplicate detection …")
    exclude_ids = _find_exact_duplicates(records, log)

    # ── 2. Per-record validation ──
    print("Validating records …")
    cleaned = []
    kept = 0
    for r in records:
        rid = r.get("id")
        if rid in exclude_ids:
            continue  # already logged as EXCLUDE

        corrections = {}

        _check_missing(r, log)
        _check_day(r, log)
        time_corrections = _check_times(r, log)
        corrections.update(time_corrections)
        _check_station_code(r, valid_station_codes, log)

        # Build output record (copy, apply corrections, never touch raw)
        out = dict(r)
        out.update(corrections)
        cleaned.append(out)
        kept += 1

    # ── 3. Write processed output ──
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False)
    print(f"  Cleaned schedules -> {output_path} ({len(cleaned):,} records kept).")

    return cleaned
