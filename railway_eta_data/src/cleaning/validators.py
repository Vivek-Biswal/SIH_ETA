"""
validators.py
Individual validation helpers used by the cleaning pipeline.
All functions are pure (no side-effects) and return structured results.
"""
import re
from datetime import datetime, time
from typing import Optional, Tuple

# ─────────────────────────────────────────────────────────────────────────────
# Time validation
# ─────────────────────────────────────────────────────────────────────────────

# Schedules use HH:MM:SS, occasionally HH:MM.
_TIME_RE = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?$")

# "None" is a deliberate sentinel in the raw data (first/last stops)
_NONE_SENTINEL = {"None", "none", "NONE", "null", "NULL", "N/A", ""}


def is_null_time(value) -> bool:
    """Return True if the value is an intentional null time sentinel."""
    if value is None:
        return True
    return str(value).strip() in _NONE_SENTINEL


def parse_time(value) -> Tuple[bool, Optional[time], str]:
    """
    Try to parse a time string.
    Returns (is_valid, time_obj_or_None, error_message).
    Handles HH:MM and HH:MM:SS; allows hours > 23 for multi-day crossing (e.g. 24:10).
    """
    if is_null_time(value):
        return True, None, "null sentinel — acceptable for terminal stops"

    s = str(value).strip()
    if not _TIME_RE.match(s):
        return False, None, f"Does not match HH:MM[:SS] pattern: {s!r}"

    parts = s.split(":")
    h, m = int(parts[0]), int(parts[1])
    sec = int(parts[2]) if len(parts) == 3 else 0

    # Allow hour == 24 as a common "next midnight" representation
    if h == 24 and m == 0 and sec == 0:
        return True, time(0, 0, 0), "24:00:00 mapped to 00:00:00 (midnight)"

    if h > 47:
        return False, None, f"Hour {h} is implausibly large"
    if m > 59 or sec > 59:
        return False, None, f"Minutes/seconds out of range in {s!r}"

    # Hours > 24 indicate trains running past midnight on multi-day journeys
    actual_h = h % 24
    return True, time(actual_h, m, sec), ""


# ─────────────────────────────────────────────────────────────────────────────
# Station code validation
# ─────────────────────────────────────────────────────────────────────────────

# Placeholder codes introduced by Datameet for unknown/unmapped stations
_PLACEHOLDER_PREFIXES = ("XX-", "YY-")


def is_placeholder_station(code: str) -> bool:
    """Return True if the station code is a Datameet placeholder."""
    if not code:
        return False
    return any(code.upper().startswith(p) for p in _PLACEHOLDER_PREFIXES)


def validate_station_code(code: str, valid_codes: set) -> Tuple[str, str]:
    """
    Validate a station code against the known set.
    Returns (decision, reason).
    """
    if not code:
        return "INVESTIGATE", "Empty station code"
    if is_placeholder_station(code):
        return "INVESTIGATE", f"Placeholder code {code!r} — real station unknown"
    if code in valid_codes:
        return "KEEP", "Code present in stations reference"
    return "INVESTIGATE", f"Code {code!r} not found in stations reference"


# ─────────────────────────────────────────────────────────────────────────────
# Train number validation
# ─────────────────────────────────────────────────────────────────────────────

def validate_train_number(number: str, valid_numbers: set) -> Tuple[str, str]:
    """
    Validate a train number against the known set.
    Returns (decision, reason).
    """
    if not number:
        return "INVESTIGATE", "Empty train number"
    if number in valid_numbers:
        return "KEEP", "Number present in trains reference"
    return "INVESTIGATE", f"Train number {number!r} not in trains reference"


# ─────────────────────────────────────────────────────────────────────────────
# Distance validation
# ─────────────────────────────────────────────────────────────────────────────

def validate_distance(distance) -> Tuple[str, str]:
    """
    Validate a route distance value.
    Distances of 0 are suspicious; very large values need investigation.
    """
    if distance is None:
        return "INVESTIGATE", "Missing distance"
    try:
        d = float(distance)
    except (ValueError, TypeError):
        return "INVESTIGATE", f"Non-numeric distance: {distance!r}"
    if d < 0:
        return "EXCLUDE", f"Negative distance {d} is invalid"
    if d == 0:
        return "INVESTIGATE", "Distance is zero — possible data error"
    if d > 5000:
        # India's longest route is ~4286 km (Dibrugarh–Kanyakumari)
        return "INVESTIGATE", f"Distance {d} km exceeds plausible max (~4300 km)"
    return "KEEP", "Distance within plausible range"


# ─────────────────────────────────────────────────────────────────────────────
# Type / category standardisation map (trains.json)
# ─────────────────────────────────────────────────────────────────────────────

# Datameet uses old community codes; map them to canonical labels.
TRAIN_TYPE_MAP = {
    "SF":    "Superfast",
    "Exp":   "Express",
    "Mail":  "Mail/Express",
    "Pass":  "Passenger",
    "MEMU":  "MEMU",
    "DEMU":  "DEMU",
    "Raj":   "Rajdhani",
    "Shtb":  "Shatabdi",
    "JShtb": "Jan Shatabdi",
    "Drnt":  "Duronto",
    "GR":    "Garib Rath",
    "SKr":   "Sampark Kranti",
    "Del":   "Special/Other",
    "Toy":   "Toy Train / Heritage",
    "Klkt":  "Kolkata Suburban",
    "Hyd":   "Hyderabad Suburban",
}


def standardise_train_type(raw_type: str) -> Tuple[str, str, str]:
    """
    Map a raw type code to a canonical label.
    Returns (decision, canonical_label, reason).
    """
    if not raw_type or raw_type.strip() == "":
        return "INVESTIGATE", "", "Empty train type — cannot classify"
    canonical = TRAIN_TYPE_MAP.get(raw_type)
    if canonical:
        return "MAP", canonical, f"Mapped {raw_type!r} -> {canonical!r}"
    return "INVESTIGATE", raw_type, f"Unknown type code {raw_type!r}"
