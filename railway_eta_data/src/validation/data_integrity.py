import pandas as pd
import os
import sys

# Allow imports from project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

import src.config as config

def run_integrity_checks():
    print("="*50)
    print("RUNNING DATA INTEGRITY CHECKS")
    print("="*50)

    all_passed = True
    
    # 1. Stations
    print("\n--- Checking Stations ---")
    stations_path = os.path.join(config.PROCESSED_DATA_DIR, "stations_clean.json")
    if os.path.exists(stations_path):
        df_stations = pd.read_json(stations_path)
        if not df_stations['code'].is_unique:
            print("[FAIL] Duplicate station codes found.")
            all_passed = False
        else:
            print("[PASS] Station codes are unique.")
    else:
        print("[FAIL] stations_clean.json missing.")
        all_passed = False

    # 2. Trains
    print("\n--- Checking Trains ---")
    trains_path = os.path.join(config.PROCESSED_DATA_DIR, "trains_clean.json")
    if os.path.exists(trains_path):
        # Read JSON and cast number to string
        df_trains = pd.read_json(trains_path)
        df_trains['number'] = df_trains['number'].astype(str)
        if not df_trains['number'].is_unique:
            print("[FAIL] Duplicate train numbers found.")
            all_passed = False
        else:
            print("[PASS] Train numbers are unique.")
    else:
        print("[FAIL] trains_clean.json missing.")
        all_passed = False

    # 3. Schedules
    print("\n--- Checking Schedules ---")
    schedules_path = os.path.join(config.PROCESSED_DATA_DIR, "schedules_clean.json")
    if os.path.exists(schedules_path):
        df_sched = pd.read_json(schedules_path)
        df_sched['train_number'] = df_sched['train_number'].astype(str)
        # For schedules, nulls might be valid (e.g. arrival time at origin), just check if df exists
        if df_sched.empty:
            print("[FAIL] Schedules dataset is empty.")
            all_passed = False
        else:
            print(f"[PASS] Schedules dataset contains {len(df_sched)} rows.")
    else:
        print("[FAIL] schedules_clean.json missing.")
        all_passed = False

    # 4. DA323 Historical
    print("\n--- Checking DA323 Historical Delays ---")
    hist_path = os.path.join(config.PROCESSED_DATA_DIR, "public_historical_delay_clean.csv")
    if os.path.exists(hist_path):
        df_hist = pd.read_csv(hist_path, dtype={'train_number': str})
        if 'avg_delay_minutes' not in df_hist.columns:
            print("[FAIL] Missing average delay column in historical data.")
            all_passed = False
        else:
            print("[PASS] DA323 contains aggregated delay stats.")
    else:
        print("[FAIL] public_historical_delay_clean.csv missing.")
        all_passed = False

    print("\n" + "="*50)
    if all_passed:
        print("INTEGRITY CHECKS: PASS")
        return True
    else:
        print("INTEGRITY CHECKS: FAIL")
        return False

if __name__ == "__main__":
    run_integrity_checks()
