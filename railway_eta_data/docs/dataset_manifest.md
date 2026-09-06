# Dataset Manifest

This document serves as the single source of truth for all processed datasets in the SIH Indian Train ETA Prediction Project.

All processed datasets are located in the `data/processed/` directory. They have been cleaned and standardized by the data pipeline (`src/run_cleaning.py`).

| Dataset Name | Filename | Format | Description |
|---|---|---|---|
| **Stations (Clean)** | `stations_clean.json` | JSON | 8,990 valid railway stations in India, including Datameet codes, names, zones, and coordinates (where available). |
| **Trains (Clean)** | `trains_clean.json` | JSON | 5,208 scheduled trains, including their train numbers, names, types, and zones. |
| **Schedules (Clean)** | `schedules_clean.json` | JSON | 416,636 schedule stops across all trains. Includes arrival, departure, day count, and distance from origin. |
| **Delays (Live Snapshot)** | `delays_clean.json` | JSON | 444 real-time train delay entries captured from a single Railpull snapshot. |
| **DA323 Historical (Clean)** | `public_historical_delay_clean.csv` | CSV | 1,479 aggregated historical delay statistics (average delay, percentage delayed >1hr, etc.) merged from 42 separate train route files. |
| **Decision Log** | `decision_log.csv` | CSV | 42,499 audit entries documenting every validation action taken by the data pipeline (KEEP, MAP, EXCLUDE, INVESTIGATE). |

## Data Linkages

- **Stations** and **Schedules** are linked via the station `code` field.
- **Trains**, **Schedules**, **Delays**, and **DA323 Historical** are linked via the `train_number` field.

> [!NOTE]
> Ensure you run `python src/run_cleaning.py` to generate these files from the raw datasets.
