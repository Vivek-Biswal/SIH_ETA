"""
Historical Delay Analysis Module
==================================
Analyzes DA323 (public_historical_delay_clean.csv) strictly as
HISTORICAL_AGGREGATED station-level statistics. Does NOT reconstruct
individual train trajectories.
"""
import statistics
from typing import List, Dict, Any

from .contract import HistoricalStationContext


def parse_da323_records(records: List[Dict[str, Any]]) -> List[HistoricalStationContext]:
    """
    Parses DA323 rows into typed HistoricalStationContext objects.
    Each record is for a (train, station) pair — aggregated separately per station.
    """
    parsed = []
    for r in records:
        try:
            avg = float(r["avg_delay_minutes"]) if r.get("avg_delay_minutes") is not None else None
        except (TypeError, ValueError):
            avg = None
        try:
            prt = float(r["percent_right_time"]) if r.get("percent_right_time") is not None else None
        except (TypeError, ValueError):
            prt = None
        try:
            psd = float(r["percent_significant_delay"]) if r.get("percent_significant_delay") is not None else None
        except (TypeError, ValueError):
            psd = None

        parsed.append(HistoricalStationContext(
            station_code=str(r.get("station_code", "")).strip().upper(),
            avg_delay_minutes=avg,
            percent_right_time=prt,
            percent_significant_delay=psd,
            temporal_status="TEMPORALLY_UNKNOWN"
        ))
    return parsed


def compute_historical_summary(records: List[HistoricalStationContext]) -> Dict[str, Any]:
    """
    Computes descriptive statistics over the aggregated DA323 dataset.
    All fields classified as HISTORICAL_AGGREGATED / TEMPORALLY_UNKNOWN.
    """
    avgs = [r.avg_delay_minutes for r in records if r.avg_delay_minutes is not None]
    prts = [r.percent_right_time for r in records if r.percent_right_time is not None]
    psds = [r.percent_significant_delay for r in records if r.percent_significant_delay is not None]

    unique_stations = len({r.station_code for r in records})

    def safe_stats(lst):
        if not lst:
            return {}
        s = sorted(lst)
        n = len(s)
        return {
            "count": n,
            "min": round(s[0], 2),
            "max": round(s[-1], 2),
            "mean": round(statistics.mean(lst), 2),
            "median": round(statistics.median(lst), 2),
            "p25": round(s[n // 4], 2),
            "p75": round(s[3 * n // 4], 2)
        }

    return {
        "dataset": "DA323 (public_historical_delay_clean.csv)",
        "observation_level": "HISTORICAL_AGGREGATED",
        "temporal_status": "TEMPORALLY_UNKNOWN",
        "total_rows": len(records),
        "unique_stations_covered": unique_stations,
        "avg_delay_minutes_stats": safe_stats(avgs),
        "percent_right_time_stats": safe_stats(prts),
        "percent_significant_delay_stats": safe_stats(psds),
        "warning": (
            "The time window of DA323 aggregation is unknown. "
            "These statistics CANNOT be used as leakage-safe ML features."
        )
    }


def build_station_lookup(records: List[HistoricalStationContext]) -> Dict[str, HistoricalStationContext]:
    """
    Returns the first record per station code for fast lookup.
    Where a station appears multiple times (different trains), we take the mean.
    """
    station_avgs: Dict[str, List[float]] = {}
    station_prts: Dict[str, List[float]] = {}
    station_psds: Dict[str, List[float]] = {}

    for r in records:
        sc = r.station_code
        if r.avg_delay_minutes is not None:
            station_avgs.setdefault(sc, []).append(r.avg_delay_minutes)
        if r.percent_right_time is not None:
            station_prts.setdefault(sc, []).append(r.percent_right_time)
        if r.percent_significant_delay is not None:
            station_psds.setdefault(sc, []).append(r.percent_significant_delay)

    lookup = {}
    for sc in set(list(station_avgs) + list(station_prts) + list(station_psds)):
        lookup[sc] = HistoricalStationContext(
            station_code=sc,
            avg_delay_minutes=round(statistics.mean(station_avgs[sc]), 2) if sc in station_avgs else None,
            percent_right_time=round(statistics.mean(station_prts[sc]), 2) if sc in station_prts else None,
            percent_significant_delay=round(statistics.mean(station_psds[sc]), 2) if sc in station_psds else None,
            temporal_status="TEMPORALLY_UNKNOWN"
        )
    return lookup
