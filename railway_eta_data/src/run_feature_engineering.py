"""
Feature Engineering Runner
==========================
Generates feature registries, runs leakage checks, and generates
feature quality reports for the SIH Indian Train ETA Project.

Does NOT modify raw or processed datasets.
Does NOT train ML models.
"""
import os
import json
import csv
import sys
import pandas as pd
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import PROCESSED_DATA_DIR, REPORTS_DIR
from features import FeatureBuilder, LeakageChecker
from eta.predictor import build_journeys_lookup

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def load_json(filename):
    with open(os.path.join(PROCESSED_DATA_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)

def load_da323(filename):
    df = pd.read_csv(os.path.join(PROCESSED_DATA_DIR, filename))
    # Aggregate by station_code to ensure uniqueness
    df = df.groupby("station_code", as_index=False)["avg_delay_minutes"].mean()
    # Convert to dict keyed by station_code
    return df.set_index("station_code").to_dict("index")

def list_to_dict(lst, key_field):
    return {str(item.get(key_field)).strip(): item for item in lst if item.get(key_field)}

def list_to_dict_upper(lst, key_field):
    return {str(item.get(key_field)).strip().upper(): item for item in lst if item.get(key_field)}

def main():
    print("Loading processed datasets...")
    
    # 1. Load Data
    trains_raw = load_json("trains_clean.json")
    stations_raw = load_json("stations_clean.json")
    delays_raw = load_json("delays_clean.json")
    journeys_raw = load_json("journeys_scheduled.json")
    da323_raw = load_da323("public_historical_delay_clean.csv")
    
    # 2. Build Lookups
    trains = list_to_dict(trains_raw, "number")
    stations = list_to_dict_upper(stations_raw, "code")
    delays = list_to_dict(delays_raw, "train_no")
    journeys = build_journeys_lookup(journeys_raw)
    
    # 3. Create Builder
    builder = FeatureBuilder(
        trains_lookup=trains,
        stations_lookup=stations,
        journeys_lookup=journeys,
        da323_lookup=da323_raw,
        delays_lookup=delays
    )
    
    print(f"Loaded {len(trains)} trains, {len(stations)} stations, {len(journeys)} journeys.")
    
    # 4. Define Feature Registry Manually Based on Contract
    registry_definition = [
        {"feature": "train_type", "category": "STATIC", "source": "trains_clean.json", "availability": "STATIC_AVAILABLE", "description": "Broad category of the train"},
        {"feature": "route_distance", "category": "STATIC", "source": "trains_clean.json", "availability": "STATIC_AVAILABLE", "description": "Total scheduled distance"},
        {"feature": "scheduled_duration_hours", "category": "STATIC", "source": "trains_clean.json", "availability": "STATIC_AVAILABLE", "description": "Total scheduled time"},
        {"feature": "destination_state", "category": "STATION_CONTEXT", "source": "stations_clean.json", "availability": "STATIC_AVAILABLE", "description": "State of destination"},
        {"feature": "destination_zone", "category": "STATION_CONTEXT", "source": "stations_clean.json", "availability": "STATIC_AVAILABLE", "description": "Zone of destination"},
        {"feature": "stop_count", "category": "ROUTE", "source": "journeys_scheduled.json", "availability": "SCHEDULE_AVAILABLE", "description": "Number of stops"},
        {"feature": "average_distance_between_stops", "category": "ROUTE", "source": "journeys_scheduled.json", "availability": "SCHEDULE_AVAILABLE", "description": "Distance / Stop count"},
        {"feature": "destination_historical_avg_delay", "category": "HISTORICAL_AGGREGATED", "source": "DA323", "availability": "HISTORICAL_CONTEXT", "description": "Average delay for station"},
        {"feature": "current_delay_minutes", "category": "LIVE", "source": "delays_clean.json", "availability": "LIVE_AVAILABLE", "description": "Current known delay"},
        {"feature": "actual_arrival_time", "category": "TARGET", "source": "None", "availability": "FUTURE_REQUIRED", "description": "Ground truth arrival time"},
        {"feature": "current_speed", "category": "LIVE", "source": "None", "availability": "FUTURE_REQUIRED", "description": "Current train speed"}
    ]
    
    # 5. Run Leakage Checks
    print("Running leakage checks...")
    checked_registry = LeakageChecker.run_registry_check(registry_definition)
    
    # 6. Generate Sample Feature Records
    print("Generating feature records...")
    records = []
    
    # We will sample 1000 journeys and predict arrival at their final destination
    sample_trains = list(journeys.keys())[:1000]
    for trn in sample_trains:
        route = journeys[trn]
        if not route:
            continue
        dest = route[-1]["station"]
        
        # Build dynamic record
        rec = builder.build_dynamic_record(trn, dest)
        records.append(rec.to_dict())
        
    df_records = pd.DataFrame(records)
    
    # 7. Generate Feature Quality Report
    print("Generating quality report...")
    quality_report = []
    for col in df_records.columns:
        if col in ("train_number", "prediction_timestamp", "prediction_context_complete"):
            continue
        missing_count = df_records[col].isnull().sum()
        missing_pct = (missing_count / len(df_records)) * 100
        unique_vals = df_records[col].nunique()
        
        # Look up leakage status
        lk = "UNKNOWN"
        for r in checked_registry:
            if r["feature"] == col:
                lk = r["leakage_risk"]
                break
                
        quality_report.append({
            "feature": col,
            "missing_count": missing_count,
            "missing_percentage": round(missing_pct, 2),
            "data_type": str(df_records[col].dtype),
            "unique_values": unique_vals,
            "leakage_status": lk
        })
        
    df_quality = pd.DataFrame(quality_report)
    
    # 8. Save Reports
    feat_dir = os.path.join(REPORTS_DIR, "features")
    ensure_dir(feat_dir)
    
    registry_path = os.path.join(feat_dir, "feature_registry.csv")
    pd.DataFrame(checked_registry).to_csv(registry_path, index=False)
    
    quality_path = os.path.join(feat_dir, "feature_quality_report.csv")
    df_quality.to_csv(quality_path, index=False)
    
    print("\n===========================================")
    print("Feature Engineering Complete")
    print(f"Generated {len(records)} feature records.")
    print(f"Registry saved to: {registry_path}")
    print(f"Quality report saved to: {quality_path}")
    print("===========================================")
    print("\nNote: ML Context is INCOMPLETE.")
    print("Actual arrival labels and time-aligned observations are missing.")

if __name__ == "__main__":
    main()
