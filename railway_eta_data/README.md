# railway_eta_data

Project for predicting Indian Train ETAs.

## Data Pipeline

The data pipeline validates, cleans, and standardises real-world raw datasets from Datameet, Railpull, and DA323. To reproduce the pipeline from scratch:

1. **Create and activate a virtual environment:**
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\Activate.ps1
   # macOS/Linux:
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run schema ingestion/inspection:**
   Generates a dataset schema summary without modifying the raw files.
   ```bash
   python src/run_ingestion.py
   ```

4. **Run data cleaning pipeline:**
   Cleans stations, trains, schedules, delays, and historical aggregated data, producing `_clean.csv` outputs in `data/processed/` and a central decision log.
   ```bash
   python src/run_cleaning.py
   ```

## Actual Limitations

Please note the following constraints when working with this repository:
1. **No Historical Actual Arrivals:** We do not possess historical actual arrival timestamps. DA323 provides *aggregated* historical data (averages, percentages), not individual journeys.
2. **Not Suitable for Supervised ML:** Because DA323 is purely aggregated, attempting to use it as both a feature and target for delay risk prediction will result in 100% data leakage.
3. **Live Data:** Railpull delays are snapshots. The RailRadar API integration is implemented (`src/live_api/railradar_client.py`), but live telemetry (like current speed or position) has not yet been collected.
4. **Conclusion:** The current data does not support training a scientifically valid dynamic supervised ETA model at this stage. It is, however, fully ready for Exploratory Data Analysis (EDA) and network analysis.

