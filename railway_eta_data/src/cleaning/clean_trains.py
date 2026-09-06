"""
clean_trains.py
Cleaning pipeline for Datameet trains.json (5,208 GeoJSON features).

Properties include:  number | name | type | zone | from_station_code |
  to_station_code | distance | duration_h | duration_m | arrival |
  departure | return_train | classes | third_ac | second_ac | first_ac |
  sleeper | chair_car | first_class | from_station_name | to_station_name

Known quirks (from profiling):
  - 'classes' is always empty string (5,208 records) -> drop from output.
  - 'type' uses old Datameet codes ('SF','Exp','Raj' …) -> MAP to canonical labels.
  - distance == 0 for some trains -> INVESTIGATE.
  - 15 records have null zone, duration, type, distance.
  - 599 records have null return_train (fine — many trains have no return).
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.cleaning.decision_log import DecisionLog
from src.cleaning.validators import (
    parse_time,
    is_null_time,
    validate_station_code,
    validate_distance,
    standardise_train_type,
)


# ─── helpers ─────────────────────────────────────────────────────────────────

def _rid(props: dict) -> str:
    return f"trains#{props.get('number', 'unknown')}"


def _check_missing(props: dict, log: DecisionLog):
    """Flag missing values in required / important fields."""
    # 'number' and 'name' are required identifiers
    for field in ("number", "name"):
        if not props.get(field):
            log.add(
                record_id=_rid(props),
                source="trains",
                issue_type="MISSING_VALUE",
                decision="INVESTIGATE",
                reason=f"Required field '{field}' is missing",
                original_value=str(props.get(field)),
            )
    # These are important but can be absent for some train types
    for field in ("zone", "distance", "duration_h", "type"):
        val = props.get(field)
        if val is None or str(val).strip() == "":
            log.add(
                record_id=_rid(props),
                source="trains",
                issue_type="MISSING_VALUE",
                decision="INVESTIGATE",
                reason=f"Field '{field}' is missing; may affect ETA features",
                original_value=str(val),
            )


def _check_type(props: dict, log: DecisionLog) -> str:
    """Standardise old type code to canonical label if mapping exists."""
    raw = props.get("type", "")
    decision, canonical, reason = standardise_train_type(raw)
    if decision == "MAP":
        log.add(
            record_id=_rid(props),
            source="trains",
            issue_type="TYPE_STANDARDISED",
            decision="MAP",
            reason=reason,
            original_value=raw,
            corrected_value=canonical,
        )
        return canonical
    elif decision == "INVESTIGATE":
        log.add(
            record_id=_rid(props),
            source="trains",
            issue_type="UNKNOWN_TYPE",
            decision="INVESTIGATE",
            reason=reason,
            original_value=raw,
        )
    return raw


def _check_distance(props: dict, log: DecisionLog):
    dist = props.get("distance")
    decision, reason = validate_distance(dist)
    if decision != "KEEP":
        log.add(
            record_id=_rid(props),
            source="trains",
            issue_type="DISTANCE_ISSUE",
            decision=decision,
            reason=reason,
            original_value=str(dist),
        )


def _check_times(props: dict, log: DecisionLog) -> dict:
    """Validate arrival and departure on trains.json (journey-level times)."""
    corrections = {}
    for field in ("arrival", "departure"):
        raw = props.get(field)
        if is_null_time(raw):
            continue
        ok, parsed, msg = parse_time(raw)
        if not ok:
            log.add(
                record_id=_rid(props),
                source="trains",
                issue_type="BAD_TIME",
                decision="INVESTIGATE",
                reason=f"Unparseable {field}: {msg}",
                original_value=str(raw),
            )
        elif msg:
            canonical = parsed.strftime("%H:%M:%S")
            corrections[field] = canonical
            log.add(
                record_id=_rid(props),
                source="trains",
                issue_type="TIME_NORMALISED",
                decision="MAP",
                reason=msg,
                original_value=str(raw),
                corrected_value=canonical,
            )
    return corrections


def _check_endpoint_codes(props: dict, valid_codes: set, log: DecisionLog):
    """Validate from/to station codes against the stations reference."""
    for field in ("from_station_code", "to_station_code"):
        code = props.get(field, "")
        if code and code not in valid_codes:
            log.add(
                record_id=_rid(props),
                source="trains",
                issue_type="UNKNOWN_STATION_CODE",
                decision="INVESTIGATE",
                reason=f"Field '{field}': code {code!r} not in stations reference",
                original_value=code,
            )


def _find_exact_duplicates(features: list, log: DecisionLog) -> set:
    """Exact duplicate: same train number."""
    seen = {}
    dups = set()
    for feat in features:
        num = feat["properties"].get("number", "")
        if num in seen:
            log.add(
                record_id=f"trains#{num}",
                source="trains",
                issue_type="EXACT_DUPLICATE",
                decision="EXCLUDE",
                reason=f"Train number {num!r} appears more than once; first occurrence kept",
                original_value=num,
            )
            dups.add(num)
        else:
            seen[num] = True
    return dups


# ─── main entry point ─────────────────────────────────────────────────────────

def clean_trains(
    input_path: str,
    output_path: str,
    valid_station_codes: set,
    log: DecisionLog,
) -> list:
    """
    Load, validate, and write cleaned trains.
    Returns cleaned list of flat property dicts.
    """
    print("Loading trains.json …")
    with open(input_path, encoding="utf-8") as f:
        raw = json.load(f)

    features = raw["features"]
    print(f"  {len(features):,} features loaded.")

    # ── 1. Duplicate detection ──
    dup_numbers = _find_exact_duplicates(features, log)

    # ── 2. Per-feature validation ──
    print("Validating train records …")
    cleaned = []
    for feat in features:
        props = feat.get("properties", {})
        num = props.get("number", "")

        if num in dup_numbers:
            continue

        _check_missing(props, log)
        canonical_type = _check_type(props, log)
        _check_distance(props, log)
        time_corrections = _check_times(props, log)
        _check_endpoint_codes(props, valid_station_codes, log)

        # 'classes' column is always empty — document once, drop from output
        out = {k: v for k, v in props.items() if k != "classes"}
        out["type_canonical"] = canonical_type
        out.update(time_corrections)
        cleaned.append(out)

    # Log the 'classes' column drop once
    log.add(
        record_id="trains#ALL",
        source="trains",
        issue_type="EMPTY_COLUMN",
        decision="EXCLUDE",
        reason="Column 'classes' is an empty string in all 5,208 records; "
               "removed from processed output",
        original_value="classes",
    )

    # ── 3. Write output ──
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)
    print(f"  Cleaned trains -> {output_path} ({len(cleaned):,} records).")

    return cleaned
