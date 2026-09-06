# Data Dictionary

This document describes every column in every processed dataset.
All files are in `data/processed/` in both JSON and CSV formats.

> **Critical distinction:** All schedule/timetable data is **static** (planned values).
> We do **not** have historical actual arrival/departure data.
> Only `delays_clean` contains a real-world observation, and it is a single live snapshot.

---

## 1. `stations_clean` -- Station Master List

**Category:** Static Reference Data
**Records:** 8,990
**Source:** Datameet Indian Railways (`stations.json`)

| Column | Data Type | Description | Example | Missing % | ETA Use |
|--------|-----------|-------------|---------|----------:|---------|
| `code` | string | Official Indian Railways station code (unique identifier) | `NDLS` | 0% | Primary join key to link stations across all datasets |
| `name` | string | Station name as recorded in the source | `NEW DELHI` | 0.01% | Display label; potential text feature for NLP |
| `state` | string | Indian state where the station is located | `Delhi` | 51.09% | Geographic grouping feature; useful for regional delay patterns |
| `zone` | string | Indian Railways zone (e.g. NR, SR, WR) | `NR` | 50.41% | Zone-level delay patterns; operational jurisdiction |
| `address` | string | Street-level address from the source | `New Delhi, Delhi` | 51.09% | Low priority; mainly for geocoding fallback |
| `lon` | float | Longitude (WGS84) | `77.2090` | 3.26% | Spatial features: distance, bearing, route geometry |
| `lat` | float | Latitude (WGS84) | `28.6424` | 3.26% | Spatial features: distance, bearing, route geometry |

---

## 2. `trains_clean` -- Train Metadata

**Category:** Static Reference Data
**Records:** 5,208
**Source:** Datameet Indian Railways (`trains.json`)

| Column | Data Type | Description | Example | Missing % | ETA Use |
|--------|-----------|-------------|---------|----------:|---------|
| `number` | string | Official train number (unique identifier) | `12952` | 0% | Primary join key for schedules and delays |
| `name` | string | Train name | `Mumbai Rajdhani Express` | 0.02% | Display label |
| `type` | string | Original Datameet type code | `Raj` | 0.29% | Raw code; prefer `type_canonical` |
| `type_canonical` | string | Standardised train type | `Rajdhani` | 0.29% | Categorical feature: different train types have different delay profiles |
| `zone` | string | Railway zone operating the train | `WR` | 0.29% | Zone-level operational patterns |
| `from_station_code` | string | Origin station code | `BCT` | 0% | Route endpoint; join to stations for coordinates |
| `from_station_name` | string | Origin station name | `MUMBAI CENTRAL` | 0% | Display |
| `to_station_code` | string | Destination station code | `NDLS` | 0% | Route endpoint |
| `to_station_name` | string | Destination station name | `NEW DELHI` | 0% | Display |
| `distance` | int | Total route distance in kilometres | `1384` | 0.29% | Numeric feature: longer routes may accumulate more delay |
| `duration_h` | int | Scheduled journey duration (hours component) | `15` | 0.29% | Expected travel time; baseline for delay calculation |
| `duration_m` | int | Scheduled journey duration (minutes component) | `35` | 0.29% | Combined with `duration_h` for total scheduled duration |
| `arrival` | string | Scheduled arrival time at destination (HH:MM:SS) | `08:35:00` | 0.29% | Scheduled arrival baseline |
| `departure` | string | Scheduled departure time from origin (HH:MM:SS) | `17:00:00` | 0.29% | Scheduled departure baseline |
| `return_train` | string | Return service train number (if any) | `12951` | 11.50% | Linked service; many trains have no return (one-way specials) |
| `sleeper` | int | Sleeper class availability (0 or 1) | `1` | 0% | Coach composition feature |
| `third_ac` | int | 3AC availability (0 or 1) | `1` | 0% | Coach composition feature |
| `second_ac` | int | 2AC availability (0 or 1) | `1` | 0% | Coach composition feature |
| `first_ac` | int | 1AC availability (0 or 1) | `1` | 0% | Coach composition feature |
| `first_class` | int | First Class availability (0 or 1) | `0` | 0% | Coach composition feature |
| `chair_car` | int | Chair Car availability (0 or 1) | `0` | 0% | Coach composition feature |

---

## 3. `schedules_clean` -- Scheduled Stop Times

**Category:** Static Timetable Data (NOT historical actuals)
**Records:** 416,636
**Source:** Datameet Indian Railways (`schedules.json`)

> **WARNING:** These are *planned* arrival/departure times, not historical records of when
> trains actually arrived. Do not use these as ground truth for delay calculation.

| Column | Data Type | Description | Example | Missing % | ETA Use |
|--------|-----------|-------------|---------|----------:|---------|
| `id` | int | Unique record identifier from the source | `302214` | 0% | Record-level join key; used in decision log |
| `train_number` | string | Train number (links to `trains_clean`) | `47154` | 0% | Primary join key |
| `train_name` | string | Train name (denormalised for convenience) | `Falaknuma Lingampalli MMTS` | <0.01% | Display |
| `station_code` | string | Station code for this stop (links to `stations_clean`) | `FM` | 0% | Join key to station reference |
| `station_name` | string | Station name for this stop | `KACHEGUDA FALAKNUMA` | <0.01% | Display |
| `day` | int or null | Journey-day offset (1 = Day 1, 2 = Day 2, etc.) | `1` | 5.38% | Critical for multi-day trains: resolves midnight crossings. Null means unknown. |
| `arrival` | string or "None" | Scheduled arrival time (HH:MM:SS) | `08:15:00` | 6.64% | Baseline scheduled time; `None` for origin stops |
| `departure` | string or "None" | Scheduled departure time (HH:MM:SS) | `08:17:00` | 6.63% | Baseline scheduled time; `None` for terminal stops |

---

## 4. `delays_clean` -- Live Delay Snapshot

**Category:** Live Snapshot Data (single point in time)
**Records:** 444
**Source:** Railpull delay poller (`delays.json` via NTES station boards)

> This is a **single snapshot** captured on 2026-09-06T18:30:40Z.
> It is NOT a historical time series. To build a training dataset, the poller
> must be run repeatedly over weeks/months.

| Column | Data Type | Description | Example | Missing % | ETA Use |
|--------|-----------|-------------|---------|----------:|---------|
| `train_number` | string | Train number | `12951` | 0% | Join key to `trains_clean` |
| `delay_min` | int or null | Current delay in minutes | `18` | 4.28% | **Target variable** for ETA prediction (when historical data is collected). Null for cancelled trains. |
| `cancelled` | bool | Whether the train is cancelled | `false` | 0% | Filter feature; cancelled trains should be excluded from delay modelling |
| `snapshot_ts` | string | ISO timestamp of when this snapshot was captured | `2026-09-06T18:30:40Z` | 0% | Temporal index for the observation |

---

## 5. `decision_log` -- Cleaning Audit Trail

**Category:** Pipeline Metadata
**Records:** 42,499
**Location:** `data/processed/decision_log.csv`

| Column | Data Type | Description | Example |
|--------|-----------|-------------|---------|
| `record_id` | string | Identifies the source record | `schedules#302214` |
| `source` | string | Dataset name | `schedules` |
| `issue_type` | string | Category of the issue | `MISSING_VALUE` |
| `decision` | string | KEEP / MAP / EXCLUDE / INVESTIGATE | `INVESTIGATE` |
| `reason` | string | Human-readable explanation | `'day' field is None` |
| `original_value` | string | The original value before any change | `None` |
| `corrected_value` | string | The corrected value (MAP decisions only) | `Superfast` |

---

## Summary: What Data We Have vs. What We Need

| What We Need for ETA | Available? | Source | Notes |
|-----------------------|:----------:|--------|-------|
| Station locations | Partial | `stations_clean` | 96.7% have coordinates; 51% lack state/zone |
| Train metadata | Yes | `trains_clean` | 5,208 trains with type, distance, duration |
| Scheduled timetable | Yes | `schedules_clean` | 416,636 stop records; static planned times only |
| **Historical actual arrivals** | **No** | -- | **Critical gap: not available in any dataset** |
| **Historical delay records** | **No** | -- | **We have only 1 snapshot of 444 trains** |
| Weather data | No | -- | External source needed |
| Track/infrastructure data | No | -- | External source needed |
