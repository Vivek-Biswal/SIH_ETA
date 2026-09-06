# Free Data Sources Inventory

> [!WARNING]
> **CORRECTION NOTICE:** Early versions of this document contained estimated or incorrect record counts (e.g. ~5000+ stations). Please refer to [`final_data_verification.md`](file:///c:/Users/Lenovo/OneDrive/Desktop/GitHub/SIH_ETA/railway_eta_data/docs/final_data_verification.md) for the true audited record counts and classifications.

This inventory documents all the legitimate publicly available data sources currently integrated into the project, classifying their exact nature and scope.

## Data Source Inventory

| SOURCE | SOURCE URL | PUBLICLY AVAILABLE? | FREE? | PERMISSION REQUIRED? | FILE | FORMAT | RECORD COUNT | DATE RANGE | DATA TYPE | KEY FIELDS | LIMITATIONS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Datameet | `https://github.com/datameet/railways` | YES | YES | NO | `stations.json` | JSON | ~5,000+ | Static (Unknown) | STATIC | `code`, `name`, `zone`, `state` | No live data. |
| Datameet | `https://github.com/datameet/railways` | YES | YES | NO | `trains.json` | JSON | ~12,000+ | Static (Unknown) | STATIC | `number`, `name`, `type`, `zone` | No live data. |
| Datameet | `https://github.com/datameet/railways` | YES | YES | NO | `schedules.json` | JSON | ~1.3M+ | Static (Unknown) | STATIC | `train_number`, `station_code`, `arrival`, `departure`, `day`, `distance` | Timetables only; no actual arrivals. |
| Railpull | `https://github.com/shwetankg07/railpull` | YES | YES | NO | `delays.json` | JSON | ~400+ | Snapshot | LIVE_SNAPSHOT | `train_number`, `d` (delay) | No location data. Single snapshot. |
| RailRadar | `https://railradar.in/docs/live-train-status` | YES | YES | YES (API Key) | N/A | API/JSON | N/A | Live | LIVE_SNAPSHOT | `train_number`, `current_status`, `delay_minutes`, `current_position_station` | Highly rate limited (1000/mo free). |
| DA323 Delay Datasets | `https://github.com/ankitaanand28/...` | YES | YES | NO | `Train_Route/*.csv` | CSV | Varies (~15-40 per train) | 2023-2024 (Approx) | HISTORICAL_AGGREGATED | `Station`, `Average_Delay(min)`, `Significant Delay` % | Aggregated stats only. No individual journeys or actual timestamps. |

> [!WARNING]
> The **DA323 IndianRailwayTrainDelayDatasets** provides historical data, but it is strictly **aggregated statistics** (e.g., average delay at a station). It does not contain individual train journeys or exact timestamps of actual arrivals.
