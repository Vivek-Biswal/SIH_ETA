"""
Delay Analysis Runner
=====================
Generates all delay analysis reports, registries, and Delay-DNA profiles.
Does NOT modify raw or processed datasets.
Does NOT train ML models. Does NOT fabricate observations.
"""
import os
import sys
import json
import csv
import pandas as pd
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import PROCESSED_DATA_DIR, REPORTS_DIR
from delay_analysis.analyzer import DelayAnalyzer
from eta.predictor import build_journeys_lookup

DELAY_REPORTS_DIR = os.path.join(REPORTS_DIR, "delay_analysis")
FIGURES_DIR = os.path.join(DELAY_REPORTS_DIR, "figures")


def ensure_dirs():
    for d in [DELAY_REPORTS_DIR, FIGURES_DIR]:
        os.makedirs(d, exist_ok=True)


def load_json(filename):
    with open(os.path.join(PROCESSED_DATA_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)


def load_csv_records(filename):
    df = pd.read_csv(os.path.join(PROCESSED_DATA_DIR, filename))
    return df.to_dict("records")


def list_to_dict(lst, key):
    return {str(item.get(key, "")).strip(): item for item in lst if item.get(key)}


def save_csv(path, rows):
    if not rows:
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


def main():
    ensure_dirs()
    print("Loading processed datasets...")

    raw_delays = load_json("delays_clean.json")
    raw_da323 = load_csv_records("public_historical_delay_clean.csv")
    raw_trains = load_json("trains_clean.json")
    raw_journeys = load_json("journeys_scheduled.json")

    trains_lookup = list_to_dict(raw_trains, "number")
    journeys_lookup = build_journeys_lookup(raw_journeys)

    analyzer = DelayAnalyzer(raw_delays, raw_da323, trains_lookup, journeys_lookup)

    # --- 1. Current Delay Summary ---
    print("Analyzing current delay snapshot...")
    cur = analyzer.current_delay_summary()
    save_csv(os.path.join(DELAY_REPORTS_DIR, "current_delay_summary.csv"), [cur])
    print(f"  Snapshot records: {cur['total_records']}, Valid delays: {cur['valid_delay_observations']}")
    print(f"  Mean: {cur['mean_delay']}, Median: {cur['median_delay']}, Max: {cur['max_delay']}")

    # --- 2. Historical Summary ---
    print("Analyzing historical aggregated data (DA323)...")
    hist = analyzer.historical_summary()
    save_csv(os.path.join(DELAY_REPORTS_DIR, "historical_delay_summary.csv"), [
        {
            "dataset": hist["dataset"],
            "observation_level": hist["observation_level"],
            "temporal_status": hist["temporal_status"],
            "total_rows": hist["total_rows"],
            "unique_stations": hist["unique_stations_covered"],
            "avg_delay_mean": hist["avg_delay_minutes_stats"].get("mean"),
            "avg_delay_median": hist["avg_delay_minutes_stats"].get("median"),
            "pct_right_time_mean": hist["percent_right_time_stats"].get("mean"),
            "warning": hist["warning"]
        }
    ])

    # --- 3. Station Coverage ---
    print("Analyzing station coverage...")
    cov = analyzer.station_coverage()
    print(f"  Scheduled stations: {cov['left_records']}, "
          f"DA323-covered: {cov['matched_records']}, "
          f"Match rate: {cov['match_rate_pct']}%")

    # --- 4. Top Delayed / Punctual Stations ---
    top_delayed = analyzer.top_delayed_stations(10)
    top_punctual = analyzer.top_punctual_stations(10)
    save_csv(os.path.join(DELAY_REPORTS_DIR, "top_delayed_stations.csv"), top_delayed)
    save_csv(os.path.join(DELAY_REPORTS_DIR, "top_punctual_stations.csv"), top_punctual)

    # --- 5. Route Association ---
    print("Analyzing route-delay associations...")
    route_assoc = analyzer.route_delay_association()
    print(f"  Pearson r (delay vs distance): {route_assoc.get('pearson_r_delay_vs_distance')}")
    print(f"  {route_assoc.get('interpretation')}")

    # --- 6. Delay by Train Type ---
    by_type = analyzer.delay_by_train_type()
    type_rows = [{"train_type": t, **stats} for t, stats in by_type.items()]
    save_csv(os.path.join(DELAY_REPORTS_DIR, "delay_by_train_type.csv"), type_rows)

    # --- 7. Recovery Feasibility ---
    print("Checking recovery analysis feasibility...")
    rec = analyzer.recovery_feasibility()
    print(f"  Recovery feasible: {rec['feasible']} — {rec.get('reason', '')}")

    # --- 8. Build Sample DNA Profiles ---
    print("Building sample Delay-DNA profiles...")
    sample_trains = list(trains_lookup.keys())[:10]
    profile_rows = []
    for tn in sample_trains:
        p = analyzer.build_dna_profile(tn)
        profile_rows.append({
            "train_number": p.train_number,
            "current_delay_minutes": p.current_delay_minutes,
            "delay_category": p.delay_category,
            "current_delay_status": p.current_delay_status,
            "historical_avg_delay": p.historical_avg_delay,
            "historical_context_status": p.historical_context_status,
            "route_distance": p.route_distance,
            "stop_count": p.stop_count,
            "scheduled_duration_hours": p.scheduled_duration_hours,
            "train_type": p.train_type,
            "route_context_status": p.route_context_status,
            "actual_arrival_time": p.actual_arrival_time,
        })
    save_csv(os.path.join(DELAY_REPORTS_DIR, "sample_dna_profiles.csv"), profile_rows)

    # --- 9. Delay Feature Registry ---
    registry = [
        {"field": "current_delay_minutes",       "category": "OBSERVED_CURRENT",       "source": "delays_clean.json",    "available_now": "YES", "temporal_status": "SNAPSHOT_ONLY",        "valid_ml_training": "NO",  "description": "Single live snapshot delay"},
        {"field": "snapshot_timestamp",           "category": "OBSERVED_CURRENT",       "source": "delays_clean.json",    "available_now": "YES", "temporal_status": "SNAPSHOT_ONLY",        "valid_ml_training": "NO",  "description": "Timestamp of snapshot"},
        {"field": "cancelled",                    "category": "OBSERVED_CURRENT",       "source": "delays_clean.json",    "available_now": "YES", "temporal_status": "SNAPSHOT_ONLY",        "valid_ml_training": "NO",  "description": "Cancellation flag"},
        {"field": "historical_avg_delay",         "category": "HISTORICAL_AGGREGATED",  "source": "DA323",                "available_now": "YES", "temporal_status": "TEMPORALLY_UNKNOWN",   "valid_ml_training": "NO",  "description": "Station-level avg delay (aggregated)"},
        {"field": "percent_right_time",           "category": "HISTORICAL_AGGREGATED",  "source": "DA323",                "available_now": "YES", "temporal_status": "TEMPORALLY_UNKNOWN",   "valid_ml_training": "NO",  "description": "Station punctuality rate"},
        {"field": "percent_significant_delay",    "category": "HISTORICAL_AGGREGATED",  "source": "DA323",                "available_now": "YES", "temporal_status": "TEMPORALLY_UNKNOWN",   "valid_ml_training": "NO",  "description": "Station significant delay rate"},
        {"field": "route_distance",               "category": "STATIC_CONTEXT",         "source": "trains_clean.json",    "available_now": "YES", "temporal_status": "VALID_ALWAYS",         "valid_ml_training": "YES", "description": "Total scheduled route distance"},
        {"field": "stop_count",                   "category": "STATIC_CONTEXT",         "source": "journeys_scheduled",   "available_now": "YES", "temporal_status": "VALID_ALWAYS",         "valid_ml_training": "YES", "description": "Number of scheduled stops"},
        {"field": "scheduled_duration_hours",     "category": "STATIC_CONTEXT",         "source": "trains_clean.json",    "available_now": "YES", "temporal_status": "VALID_ALWAYS",         "valid_ml_training": "YES", "description": "Scheduled journey duration"},
        {"field": "actual_arrival_time",          "category": "NOT_AVAILABLE",          "source": "None",                 "available_now": "NO",  "temporal_status": "NOT_AVAILABLE",        "valid_ml_training": "N/A", "description": "Ground truth label — blocks all ML"},
        {"field": "historical_trajectory",        "category": "NOT_AVAILABLE",          "source": "None",                 "available_now": "NO",  "temporal_status": "NOT_AVAILABLE",        "valid_ml_training": "N/A", "description": "Individual delay time-series — blocks recovery"},
    ]
    save_csv(os.path.join(DELAY_REPORTS_DIR, "delay_feature_registry.csv"), registry)

    # --- 10. Delay Quality Report ---
    quality_rows = [
        {"dataset": "delays_clean.json",                      "field": "delay_min",             "record_count": cur["total_records"],              "missing_count": cur["missing_delay_count"],     "missing_pct": cur["missing_delay_pct"],     "data_level": "OBSERVED_CURRENT",      "temporal_status": "SNAPSHOT_ONLY",      "valid_current": "YES", "valid_ml": "NO"},
        {"dataset": "public_historical_delay_clean.csv (DA323)", "field": "avg_delay_minutes", "record_count": hist["total_rows"],                 "missing_count": 0,                              "missing_pct": 0,                            "data_level": "HISTORICAL_AGGREGATED", "temporal_status": "TEMPORALLY_UNKNOWN", "valid_current": "CONTEXT_ONLY", "valid_ml": "NO"},
    ]
    save_csv(os.path.join(DELAY_REPORTS_DIR, "delay_quality_report.csv"), quality_rows)

    print("\n===========================================")
    print("Delay Analysis Complete")
    print(f"All reports saved to: {DELAY_REPORTS_DIR}")
    print("\n[ML Readiness] NOT READY")
    print("  - actual_arrival_time: MISSING (blocks training)")
    print("  - historical_trajectory: MISSING (blocks recovery measurement)")
    print("===========================================")


if __name__ == "__main__":
    main()
