# Unified Data Architecture

This document outlines the structured architecture for the ETA Prediction system, detailing how each dataset is utilized and interconnected. We intentionally avoid a single monolithic CSV merge, instead relying on normalized relation tables.

## 1. Processed Data Store (`data/processed/`)

The architecture consists of four distinct layers:

### A. Static Reference Layer (from Datameet)
- `stations_clean.csv`: Primary source of truth for Station Code, Name, Zone, and State.
- `trains_clean.csv`: Primary source of truth for Train Number, Name, Type, and Zone.
- `schedules_clean.csv`: The static timetable mapping `train_number` to `station_code` sequences, giving scheduled arrival/departure times and distances.

**Role:** Defines the topology of the railway network. Provides the baseline "Scheduled" state that ETA models predict deviations against.

### B. Historical Aggregated Layer (from DA323 Delay Datasets)
- `public_historical_delay_clean.csv`: Provides historical average delay and punctuality probabilities for a specific `train_number` at a specific `station_code`.

**Role:** Acts as historical feature lookup. When predicting a delay for Train X at Station Y, this table provides the prior probability of delay based on 2023-2024 statistics.

### C. Live Snapshot Layer (from Railpull / RailRadar)
- `delays_clean.json/csv` (Railpull): Sparse delay snapshot without location.
- Live Telemetry (RailRadar API): Provides real-time `current_position_station`, `speed_kmh`, and `delay_minutes`.

**Role:** Provides the current state (observation) for the ML model.

## 2. Dataset Interconnections (Joins)

Datasets are interconnected using the following primary keys:

1. **Train Identity Join:** 
   - `Historical Delay (train_number)` → `Static Trains (number)`
   - *Purpose:* Enriches historical stats with train type (e.g. Express vs Superfast).
2. **Station Identity Join:**
   - `Historical Delay (station_code)` → `Static Stations (code)`
   - *Purpose:* Enriches delays with geographic/zone context.
3. **Schedule / Route Join:**
   - `Historical Delay (train_number, station_code)` → `Static Schedules (train_number, station_code)`
   - *Purpose:* Combines the historical average delay at a station with the scheduled arrival time at that station, allowing us to approximate an expected arrival time feature.

## 3. Separation of Concerns

We intentionally do **not** merge Live Snapshots with Historical Aggregated data into a single table.
- **Historical data** is used offline to generate *Static Features* (e.g., historical risk of delay).
- **Live Snapshot data** is used at inference time as the *Dynamic Input* to the model.

## 4. ETA System Contribution Summary

* **Datameet:** Provides the target route and scheduled time.
* **DA323 Historical:** Provides the historical risk profile (prior bias) for a train/station pair.
* **RailRadar Live:** Provides the real-time trigger and current lag.
