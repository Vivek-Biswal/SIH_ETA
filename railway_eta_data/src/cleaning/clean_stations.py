"""
clean_stations.py
Cleaning pipeline for Datameet stations.json (8,990 GeoJSON features).

Properties:  state | code | name | zone | address
Geometry:    Point [lon, lat] or null

Known quirks (from profiling):
  - 4,593 records have null state, zone, address -> informational gap, not fatal.
  - 293 records have null geometry -> no coordinates.
  - 23 records have XX-/YY- placeholder codes -> unknown real station.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.cleaning.decision_log import DecisionLog
from src.cleaning.validators import is_placeholder_station, standardise_train_type


# ─── helpers ─────────────────────────────────────────────────────────────────

def _rid(props: dict) -> str:
    return f"stations#{props.get('code', 'unknown')}"


def _check_placeholder(code: str, props: dict, log: DecisionLog) -> str:
    """Placeholder codes have no real mapping -> INVESTIGATE."""
    if is_placeholder_station(code):
        log.add(
            record_id=_rid(props),
            source="stations",
            issue_type="PLACEHOLDER_CODE",
            decision="INVESTIGATE",
            reason=f"Code {code!r} is a Datameet placeholder; "
                   "real station identity unknown",
            original_value=code,
        )
        return "INVESTIGATE"
    return "KEEP"


def _check_missing_props(code: str, props: dict, log: DecisionLog):
    """Log informational gaps (state, zone, address)."""
    for field in ("state", "zone", "address"):
        val = props.get(field)
        if val is None or str(val).strip() == "":
            log.add(
                record_id=_rid(props),
                source="stations",
                issue_type="MISSING_VALUE",
                decision="INVESTIGATE",
                reason=f"Property '{field}' is null — enrichment may fill this later",
                original_value="None",
            )


def _check_geometry(feature: dict, code: str, log: DecisionLog):
    """Null geometry means we have no coordinates for this station."""
    if feature.get("geometry") is None:
        log.add(
            record_id=f"stations#{code}",
            source="stations",
            issue_type="MISSING_GEOMETRY",
            decision="INVESTIGATE",
            reason="No coordinates available; OSM enrichment step required",
        )


def _find_duplicate_codes(features: list, log: DecisionLog) -> set:
    """Flag stations with duplicate codes; keep first occurrence."""
    seen = {}
    dup_codes = set()
    for feat in features:
        code = feat["properties"].get("code", "")
        if code in seen:
            log.add(
                record_id=f"stations#{code}",
                source="stations",
                issue_type="DUPLICATE_CODE",
                decision="INVESTIGATE",
                reason=f"Station code {code!r} appears more than once; "
                       "manual review needed to pick canonical record",
                original_value=code,
            )
            dup_codes.add(code)
        else:
            seen[code] = feat
    return dup_codes


# ─── main entry point ─────────────────────────────────────────────────────────

def clean_stations(
    input_path: str,
    output_path: str,
    log: DecisionLog,
) -> list:
    """
    Load, validate, and write cleaned stations.
    Returns the cleaned feature list (properties only, as flat dicts).
    """
    print("Loading stations.json …")
    with open(input_path, encoding="utf-8") as f:
        raw = json.load(f)

    features = raw["features"]
    print(f"  {len(features):,} features loaded.")

    # ── 1. Duplicate code detection ──
    print("Checking for duplicate station codes …")
    dup_codes = _find_duplicate_codes(features, log)

    # ── 2. Per-feature validation ──
    print("Validating station records …")
    cleaned = []
    for feat in features:
        props = feat.get("properties", {})
        code = props.get("code", "")

        status = _check_placeholder(code, props, log)
        _check_missing_props(code, props, log)
        _check_geometry(feat, code, log)

        # Flatten into a clean dict for processed output
        geom = feat.get("geometry")
        lon = geom["coordinates"][0] if geom else None
        lat = geom["coordinates"][1] if geom else None

        out = {
            "code": code,
            "name": props.get("name"),
            "state": props.get("state"),
            "zone": props.get("zone"),
            "address": props.get("address"),
            "lon": lon,
            "lat": lat,
            "_status": status,       # internal flag, not a cleaning mutation
        }
        cleaned.append(out)

    # ── 3. Write processed output ──
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)
    print(f"  Cleaned stations -> {output_path} ({len(cleaned):,} records).")

    return cleaned
