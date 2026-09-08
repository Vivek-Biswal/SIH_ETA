"""
Current Delay Analysis Module
==============================
Analyzes the live delay snapshot from delays_clean.json.
"""
import statistics
from typing import List, Dict, Any, Optional

from .contract import DelayObservation

# Analytical thresholds (explicitly documented — NOT official IR categories)
DELAY_BINS = {
    "low": (1, 15),
    "moderate": (16, 60),
    "high": (61, 180),
    "severe": (181, float("inf"))
}


def categorize_delay(delay_minutes: float) -> str:
    """
    Classify delay into an analytical category.
    Thresholds are analytical only; not official Indian Railways definitions.
    """
    if delay_minutes <= 0:
        return "none"
    for cat, (lo, hi) in DELAY_BINS.items():
        if lo <= delay_minutes <= hi:
            return cat
    return "severe"


def parse_observations(raw_records: List[Dict[str, Any]]) -> List[DelayObservation]:
    """
    Parses raw delay records into typed DelayObservation objects.
    """
    obs = []
    for r in raw_records:
        try:
            dm = float(r["delay_min"]) if r.get("delay_min") is not None else None
        except (TypeError, ValueError):
            dm = None

        cancelled = bool(r.get("cancelled", False))
        obs.append(DelayObservation(
            train_number=str(r.get("train_number", "")).strip(),
            delay_minutes=dm,
            cancelled=cancelled,
            snapshot_timestamp=r.get("snapshot_ts"),
            delay_category=categorize_delay(dm) if dm is not None else None
        ))
    return obs


def compute_summary(observations: List[DelayObservation]) -> Dict[str, Any]:
    """
    Computes descriptive statistics for the current delay snapshot.
    Returns explicit counts for all observation status types.
    """
    total = len(observations)
    cancelled = [o for o in observations if o.cancelled]
    valid = [o for o in observations if o.delay_minutes is not None and not o.cancelled]
    missing = [o for o in observations if o.delay_minutes is None and not o.cancelled]
    delays = [o.delay_minutes for o in valid]

    n = len(delays)
    sorted_d = sorted(delays) if delays else []

    def pct(idx):
        return sorted_d[int(idx * n / 100)] if n > 0 else None

    categories = {}
    for o in valid:
        cat = o.delay_category or "unknown"
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "snapshot_note": "SINGLE_SNAPSHOT — not a historical time series",
        "total_records": total,
        "valid_delay_observations": n,
        "missing_delay_count": len(missing),
        "missing_delay_pct": round(len(missing) / total * 100, 2) if total else 0,
        "cancelled_count": len(cancelled),
        "cancelled_pct": round(len(cancelled) / total * 100, 2) if total else 0,
        "min_delay": min(delays) if delays else None,
        "max_delay": max(delays) if delays else None,
        "mean_delay": round(statistics.mean(delays), 2) if delays else None,
        "median_delay": statistics.median(delays) if delays else None,
        "p25_delay": pct(25),
        "p75_delay": pct(75),
        "p90_delay": pct(90),
        "p99_delay": pct(99),
        "zero_delay_count": sum(1 for d in delays if d == 0),
        "categories": categories
    }
