"""
Route Delay Patterns Module
============================
Explores associations between route characteristics and available delay context.
All results are DESCRIPTIVE ASSOCIATIONS only — not causal claims.
"""
import statistics
from typing import Dict, Any, List


def analyze_route_delay_association(
    train_records: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Examines descriptive associations between route structure and delay observations.
    
    IMPORTANT: Results are exploratory and associational only.
    Do NOT interpret as causal ("long routes CAUSE delays").
    Language used: "associated with", "observed pattern", "descriptive".
    """
    valid = [
        r for r in train_records
        if r.get("current_delay_minutes") is not None
        and r.get("route_distance") is not None
    ]

    if len(valid) < 2:
        return {
            "note": "Insufficient paired observations for association analysis.",
            "valid_pairs": len(valid)
        }

    delays = [r["current_delay_minutes"] for r in valid]
    distances = [r["route_distance"] for r in valid]

    # Compute Pearson correlation manually to avoid scipy dependency
    n = len(delays)
    mean_d = statistics.mean(delays)
    mean_dist = statistics.mean(distances)

    numerator = sum((delays[i] - mean_d) * (distances[i] - mean_dist) for i in range(n))
    denom_d = (sum((d - mean_d) ** 2 for d in delays)) ** 0.5
    denom_dist = (sum((d - mean_dist) ** 2 for d in distances)) ** 0.5
    denom = denom_d * denom_dist

    correlation = round(numerator / denom, 4) if denom != 0 else None

    return {
        "analysis_type": "DESCRIPTIVE_ASSOCIATION",
        "causal_claim": False,
        "valid_pairs": n,
        "delay_mean": round(mean_d, 2),
        "distance_mean": round(mean_dist, 2),
        "pearson_r_delay_vs_distance": correlation,
        "interpretation": (
            f"A Pearson correlation of {correlation} between delay and route distance was observed "
            f"across {n} trains. This is a descriptive association. "
            "It does NOT imply that longer routes cause delays."
        )
    }


def group_delay_by_train_type(
    train_records: List[Dict[str, Any]]
) -> Dict[str, Dict[str, Any]]:
    """
    Groups current delay observations by train type for descriptive comparison.
    """
    groups: Dict[str, List[float]] = {}
    for r in train_records:
        t = r.get("train_type") or "Unknown"
        d = r.get("current_delay_minutes")
        if d is not None:
            groups.setdefault(t, []).append(d)

    result = {}
    for t, delays in groups.items():
        result[t] = {
            "count": len(delays),
            "mean_delay": round(statistics.mean(delays), 2),
            "median_delay": statistics.median(delays)
        }
    return result
