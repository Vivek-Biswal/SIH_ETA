"""
run_cleaning.py
Orchestrates the full data cleaning and validation pipeline.
Run from the project root:
    python src/run_cleaning.py

Steps:
  1. Stations (used to build the valid-codes reference for cross-validation)
  2. Trains
  3. Schedules (largest dataset — cross-validated against stations)
  4. Delays (Railpull snapshot — cross-validated against trains)

Outputs:
  data/processed/stations_clean.json
  data/processed/trains_clean.json
  data/processed/schedules_clean.json
  data/processed/delays_clean.json
  data/processed/decision_log.csv
"""
import os
import sys
import json

# Allow imports from project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from src.cleaning.decision_log import DecisionLog
from src.cleaning.clean_stations import clean_stations
from src.cleaning.clean_trains import clean_trains
from src.cleaning.clean_schedules import clean_schedules
from src.cleaning.clean_delays import clean_delays

# ─── paths ───────────────────────────────────────────────────────────────────
RAW_DATAMEET = os.path.join(PROJECT_ROOT, "data", "raw", "railways")
RAW_RAILPULL = os.path.join(PROJECT_ROOT, "data", "raw", "railpull", "data", "out")
PROCESSED    = os.path.join(PROJECT_ROOT, "data", "processed")
DECISION_LOG = os.path.join(PROCESSED, "decision_log.csv")


def main():
    log = DecisionLog()

    # ─── Step 1: Stations ─────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("STEP 1 — Cleaning: stations.json")
    print("="*60)
    stations = clean_stations(
        input_path=os.path.join(RAW_DATAMEET, "stations.json"),
        output_path=os.path.join(PROCESSED, "stations_clean.json"),
        log=log,
    )

    # Build valid-code reference set (excludes placeholders)
    valid_station_codes = {
        s["code"] for s in stations
        if s.get("code") and not s["code"].startswith(("XX-", "YY-"))
    }
    print(f"  Reference: {len(valid_station_codes):,} valid station codes.")

    # ─── Step 2: Trains ───────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("STEP 2 — Cleaning: trains.json")
    print("="*60)
    trains = clean_trains(
        input_path=os.path.join(RAW_DATAMEET, "trains.json"),
        output_path=os.path.join(PROCESSED, "trains_clean.json"),
        valid_station_codes=valid_station_codes,
        log=log,
    )

    # Build valid-train-number reference
    valid_train_numbers = {t["number"] for t in trains if t.get("number")}
    print(f"  Reference: {len(valid_train_numbers):,} valid train numbers.")

    # ─── Step 3: Schedules ────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("STEP 3 — Cleaning: schedules.json (this may take a minute …)")
    print("="*60)
    clean_schedules(
        input_path=os.path.join(RAW_DATAMEET, "schedules.json"),
        output_path=os.path.join(PROCESSED, "schedules_clean.json"),
        valid_station_codes=valid_station_codes,
        log=log,
    )

    # ─── Step 4: Delays ───────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("STEP 4 — Cleaning: delays.json (Railpull)")
    print("="*60)
    delays_path = os.path.join(RAW_RAILPULL, "delays.json")
    if os.path.exists(delays_path):
        clean_delays(
            input_path=delays_path,
            output_path=os.path.join(PROCESSED, "delays_clean.json"),
            valid_train_numbers=valid_train_numbers,
            log=log,
        )
    else:
        print("  delays.json not found — skipping.")

    # ─── Save decision log ────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("SAVING DECISION LOG")
    print("="*60)
    log.save(DECISION_LOG)

    # ─── Summary ─────────────────────────────────────────────────────────────
    summary = log.summary()
    print("\n" + "="*60)
    print("PIPELINE SUMMARY")
    print("="*60)
    for decision, count in summary.items():
        print(f"  {decision:>12}: {count:>8,} log entries")
    print(f"\n  Decision log: {DECISION_LOG}")
    print("  Processed files: data/processed/")
    print("\nDone. Raw files were not modified.")


if __name__ == "__main__":
    main()
