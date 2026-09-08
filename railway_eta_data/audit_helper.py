import os
import json
import csv
import ast

def count_records():
    stats = {}
    base = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Raw Data Counts
    raw_datameet_stations = os.path.join(base, "data", "raw", "railways", "stations.json")
    if os.path.exists(raw_datameet_stations):
        with open(raw_datameet_stations, "r", encoding="utf-8") as f:
            data = json.load(f)
            stats["raw_stations_count"] = len(data.get("features", []))
            
    raw_datameet_trains = os.path.join(base, "data", "raw", "railways", "trains.json")
    if os.path.exists(raw_datameet_trains):
        with open(raw_datameet_trains, "r", encoding="utf-8") as f:
            data = json.load(f)
            stats["raw_trains_count"] = len(data.get("features", []))
            
    raw_datameet_schedules = os.path.join(base, "data", "raw", "railways", "schedules.json")
    if os.path.exists(raw_datameet_schedules):
        with open(raw_datameet_schedules, "r", encoding="utf-8") as f:
            data = json.load(f)
            stats["raw_schedules_count"] = len(data)
            
    raw_da323 = os.path.join(base, "data", "raw", "public_historical_delay", "data.csv")
    if os.path.exists(raw_da323):
        with open(raw_da323, "r", encoding="utf-8") as f:
            stats["raw_da323_count"] = sum(1 for _ in f) - 1
            
    # Processed Data Counts
    proc_delays = os.path.join(base, "data", "processed", "delays_clean.json")
    if os.path.exists(proc_delays):
        with open(proc_delays, "r", encoding="utf-8") as f:
            data = json.load(f)
            stats["proc_delays_count"] = len(data)

    proc_journeys = os.path.join(base, "data", "processed", "journeys_scheduled.json")
    if os.path.exists(proc_journeys):
        with open(proc_journeys, "r", encoding="utf-8") as f:
            data = json.load(f)
            stats["proc_journeys_count"] = len(data)

    proc_trains = os.path.join(base, "data", "processed", "trains_clean.json")
    if os.path.exists(proc_trains):
        with open(proc_trains, "r", encoding="utf-8") as f:
            data = json.load(f)
            stats["proc_trains_count"] = len(data)
            
    return stats

def analyze_repo():
    base = os.path.dirname(os.path.abspath(__file__))
    
    files_list = []
    has_ml = False
    ml_keywords = ["sklearn", "tensorflow", "pytorch", "model.fit"]
    ml_files = []
    
    for root, dirs, files in os.walk(base):
        if ".venv" in root or ".git" in root or "__pycache__" in root:
            continue
        for file in files:
            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, base)
            files_list.append(rel_path)
            
            # Check ML
            if file.endswith(".py") or file.endswith(".ipynb"):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                        for kw in ml_keywords:
                            if kw in content:
                                has_ml = True
                                ml_files.append((rel_path, kw))
                except Exception:
                    pass

    return {
        "files": files_list,
        "has_ml": has_ml,
        "ml_files": ml_files
    }

if __name__ == "__main__":
    out = {
        "counts": count_records(),
        "repo": analyze_repo()
    }
    with open("audit_results.json", "w") as f:
        json.dump(out, f, indent=2)
    print("Audit helper complete.")
