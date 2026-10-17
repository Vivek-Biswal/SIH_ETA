# railway_eta_data

Offline dataset preparation and deterministic baseline workspace for Indian train
arrival estimates. This workspace documents the original preparation datasets;
it is separate from the backend's limited trained-model pilot described in the
[ETA model audit](../docs/ETA_MODEL_AUDIT.md).

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

Please note the following constraints of these preparation datasets and baseline:
1. **No Historical Actual Arrivals in These Datasets:** The original preparation datasets lack historical actual arrival timestamps. DA323 provides *aggregated* historical data (averages, percentages), not individual journeys.
2. **Not Suitable for Supervised Model Training:** Because DA323 is purely aggregated, using its same summary as both an input and target leaks the target into the inputs and cannot establish journey-level arrival accuracy.
3. **Live Data:** Railpull delays are snapshots. The RailRadar API integration is implemented (`src/live_api/railradar_client.py`), but live telemetry (like current speed or position) has not yet been collected.
4. **Conclusion:** The current data does not support training a scientifically valid dynamic supervised ETA model at this stage. It is, however, fully ready for Exploratory Data Analysis (EDA) and network analysis.

## GROUP A — JOURNEY RECONSTRUCTION

The Journey Reconstruction module converts isolated, unordered schedule stops into sequential train routes.

- **Input**: Processed railway data (`schedules_clean.json`, `trains_clean.json`)
- **Output**: Reconstructed scheduled train journeys (`journeys_scheduled.json`)

To run the reconstruction:
```bash
python src/run_journey_reconstruction.py
```

> **IMPORTANT LIMITATION**: This module outputs **Scheduled Journeys**. It does NOT represent historical actual train movement, as the underlying datasets lack actual historical arrival timestamps.
