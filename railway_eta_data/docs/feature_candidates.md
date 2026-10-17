# Feature Candidates

> Historical preparation snapshot. Statements about data availability,
> implementation and next steps describe the `railway_eta_data` preparation
> stage. For the current trained pilot and application status, see the
> [model audit](../../docs/ETA_MODEL_AUDIT.md) and
> [feature status](../../docs/FEATURE_STATUS.md).

> [!WARNING]
> **CORRECTION NOTICE:** Earlier feature lists incorrectly assumed "Current Speed" was available. Please refer to [`final_data_verification.md`](final_data_verification.md) for the verified status of live features and the determination that the DA323 dataset is unsuitable for supervised training.

This document outlines the predictive feature candidates that can be safely derived from our *available real data*.

## 1. Static Features

| FEATURE NAME | SOURCE | HOW DERIVED | AVAILABLE? | LIMITATIONS |
|---|---|---|---|---|
| Train Type | Datameet (`trains.json`) | Direct lookup by `train_number`. | YES | Missing for Special/Holiday trains. |
| Number of Stops | Datameet (`schedules.json`) | Count of records for a `train_number`. | YES | Timetable may not reflect temporary stops. |
| Scheduled Journey Duration | Datameet (`schedules.json`) | `arrival` of target station minus `departure` of origin station. | YES | Requires parsing Day offset. |
| Distance | Datameet (`schedules.json`) | `distance` field. | YES | Sometimes inaccurate in legacy data. |
| Station State/Zone | Datameet (`stations.json`) | Lookup by `station_code`. | YES | None |

## 2. Time Features

| FEATURE NAME | SOURCE | HOW DERIVED | AVAILABLE? | LIMITATIONS |
|---|---|---|---|---|
| Scheduled Hour | Datameet (`schedules.json`) | Extract hour from `arrival` or `departure`. | YES | None |
| Day of Week | N/A | Extracted from a Live request's date. | YES | Requires a live query timestamp. |
| Month | N/A | Extracted from a Live request's date. | YES | Requires a live query timestamp. |

## 3. Historical Features

| FEATURE NAME | SOURCE | HOW DERIVED | AVAILABLE? | LIMITATIONS |
|---|---|---|---|---|
| Average Station Delay | DA323 (`public_historical_delay_clean.csv`) | Direct lookup by `(train_number, station_code)`. | YES | Only covers ~40 trains from the dataset. |
| Historical Punctuality | DA323 (`public_historical_delay_clean.csv`) | The `percent_right_time` field. | YES | Only covers ~40 trains. |
| Significant Delay Risk | DA323 (`public_historical_delay_clean.csv`) | The `percent_significant_delay` field. | YES | Only covers ~40 trains. |

## 4. Live Features

| FEATURE NAME | SOURCE | HOW DERIVED | AVAILABLE? | LIMITATIONS |
|---|---|---|---|---|
| Current Delay | RailRadar API | Extracted from `delay_minutes`. | YES (via API) | API is rate-limited. |
| Current Speed | RailRadar API | Extracted from `speed_kmh`. | YES (via API) | Sometimes telemetry degrades. |
| Segment Progress | RailRadar API | Extracted from `segment_progress`. | YES (via API) | Sometimes telemetry degrades. |

> [!WARNING]
> While we can derive many features to feed a predictive model, **we still cannot derive the target variable** (`actual_arrival_time`) from historical data, because DA323 only provides aggregated stats, and Datameet only provides static schedules.
