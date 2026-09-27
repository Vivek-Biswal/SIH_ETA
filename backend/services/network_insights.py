"""Read-only network analysis from the project's dated model outputs.

These are historical interactions, never live congestion or dispatch alerts.
File signatures invalidate the cache when a new analysis is published.
"""
import csv
import math
import os
from datetime import date
from functools import lru_cache
from pathlib import Path
from time import monotonic


DEFAULT_OUTPUTS = Path(__file__).resolve().parents[2] / "notebooks" / "outputs"


def number(value, *, minimum=None, maximum=None):
    parsed = float(value)
    if not math.isfinite(parsed) or (minimum is not None and parsed < minimum) or (
        maximum is not None and parsed > maximum
    ):
        raise ValueError("Invalid analysis value")
    return parsed


def train_number(value):
    value = str(value).strip()
    if not value.isdigit() or not 1 <= len(value) <= 5:
        raise ValueError("Invalid train number")
    return value.zfill(5)


def risk_band(score):
    if score >= 0.60:
        return "critical"
    if score >= 0.55:
        return "high"
    if score >= 0.50:
        return "elevated"
    if score >= 0.47:
        return "moderate"
    return "low"


@lru_cache(maxsize=1)
def _read_analysis(directory, signatures, cache_window):
    # Signatures form part of the cache key, rather than an invented observation time.
    del signatures, cache_window
    root = Path(directory)
    interactions = []
    stations = []
    with (root / "operational_risk.csv").open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            service_date = date.fromisoformat(row["service_date"]).isoformat()
            score = number(row["risk_score"], minimum=0, maximum=1)
            station = row["station"].strip().upper()
            if not station or not station.isalnum():
                raise ValueError("Invalid station")
            interactions.append({
                "service_date": service_date,
                "station": station,
                "source_train": train_number(row["source_train"]),
                "target_train": train_number(row["target_train"]),
                "source_delay_minutes": number(row["source_arr_delay"]),
                "target_delay_minutes": number(row["target_arr_delay"]),
                "gap_minutes": number(row["gap_minutes"], minimum=0),
                "risk_score": score,
                "risk": risk_band(score),
            })
    with (root / "network_bottlenecks.csv").open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            score = number(row["mean_risk"], minimum=0, maximum=1)
            stations.append({
                "station": row["station"].strip().upper(),
                "interactions": int(number(row["interactions"], minimum=0)),
                "flagged_interactions": int(number(row["high_risk_interactions"], minimum=0)),
                "mean_source_delay_minutes": number(row["mean_source_delay"]),
                "mean_gap_minutes": number(row["mean_gap"], minimum=0),
                "risk_score": score,
                "risk": risk_band(score),
                "bottleneck_score": number(row["bottleneck_score"], minimum=0),
            })
    if not interactions or not stations:
        raise ValueError("Analysis is empty")
    interactions.sort(key=lambda row: (row["risk_score"], row["service_date"]), reverse=True)
    stations.sort(key=lambda row: row["bottleneck_score"], reverse=True)
    dates = [row["service_date"] for row in interactions]
    return stations, interactions, min(dates), max(dates)


class NetworkInsightsService:
    def __init__(self, output_dir=None):
        self.output_dir = Path(output_dir or os.environ.get("NETWORK_ANALYSIS_DIR", DEFAULT_OUTPUTS))

    def get_insights(self, query="", limit=50):
        paths = [self.output_dir / name for name in ("network_bottlenecks.csv", "operational_risk.csv")]
        signatures = tuple((path.stat().st_mtime_ns, path.stat().st_size) for path in paths)
        stations, records, period_start, period_end = _read_analysis(
            str(self.output_dir.resolve()), signatures, int(monotonic() // 60)
        )
        query = query.strip().upper()
        filtered_records = [row for row in records if not query or query in row["station"] or
                            query in row["source_train"] or query in row["target_train"]]
        matching_stations = {row["station"] for row in filtered_records} if query else set()
        filtered_stations = [row for row in stations if not query or query in row["station"] or
                             row["station"] in matching_stations]
        return {
            "data_source": "historical",
            "analysis_method": "historical_propagation_model",
            "live_available": False,
            "period_start": period_start,
            "period_end": period_end,
            "query": query,
            "station_count": len(filtered_stations),
            "interaction_count": len(filtered_records),
            "high_risk_count": sum(row["risk"] in ("high", "critical") for row in filtered_records),
            "stations": filtered_stations[:limit],
            "interactions": filtered_records[:limit],
            "limit": limit,
            "explanation": "Historical model scores describe recorded train interactions. They are not current incidents, calibrated probabilities or proof that one train caused another delay.",
        }
