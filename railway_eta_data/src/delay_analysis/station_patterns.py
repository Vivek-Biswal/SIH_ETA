"""
Station Delay Patterns Module
==============================
Analyzes station-level delay context and join coverage.
"""
from typing import Dict, Any, List

from .contract import HistoricalStationContext


def analyze_station_coverage(
    station_codes_in_schedules: List[str],
    historical_lookup: Dict[str, HistoricalStationContext]
) -> Dict[str, Any]:
    """
    Measures how many scheduled stations have historical DA323 context.
    Explicitly tracks unmatched stations.
    """
    left = len(station_codes_in_schedules)
    matched = [sc for sc in station_codes_in_schedules if sc.upper() in historical_lookup]
    unmatched = [sc for sc in station_codes_in_schedules if sc.upper() not in historical_lookup]

    return {
        "left_records": left,
        "right_records": len(historical_lookup),
        "matched_records": len(matched),
        "unmatched_records": len(unmatched),
        "match_rate_pct": round(len(matched) / left * 100, 2) if left else 0,
        "unmatched_sample": unmatched[:10]
    }


def rank_stations_by_avg_delay(
    historical_lookup: Dict[str, HistoricalStationContext],
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """
    Returns top-N stations by average delay (highest to lowest).
    Descriptive ranking only — not a causal statement.
    """
    stations_with_data = [
        {"station_code": sc, "avg_delay_minutes": ctx.avg_delay_minutes}
        for sc, ctx in historical_lookup.items()
        if ctx.avg_delay_minutes is not None
    ]
    return sorted(stations_with_data, key=lambda x: x["avg_delay_minutes"], reverse=True)[:top_n]


def rank_stations_by_punctuality(
    historical_lookup: Dict[str, HistoricalStationContext],
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """
    Returns top-N stations by right-time percentage (most punctual).
    """
    stations_with_data = [
        {"station_code": sc, "percent_right_time": ctx.percent_right_time}
        for sc, ctx in historical_lookup.items()
        if ctx.percent_right_time is not None
    ]
    return sorted(stations_with_data, key=lambda x: x["percent_right_time"], reverse=True)[:top_n]
