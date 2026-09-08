# Delay Data Contract

This document formalizes every delay-related data field currently available in the SIH Indian Train ETA Project, distinguishing clearly between live snapshots and historical aggregations.

## 1. Current Observed Delay

### `current_delay_minutes`
- **Description**: The delay of a train measured at a single snapshot in time.
- **Source**: `delays_clean.json`
- **Data Type**: Numeric (Float)
- **Time Semantics**: Valid ONLY at the snapshot timestamp.
- **Observation Level**: Individual train snapshot.
- **Available Now?**: YES (as a static snapshot, not a stream).
- **Limitations**: We do not possess a history of this value, only the latest known value. We cannot compute how this delay evolved over the journey.

## 2. Historical Aggregated Delay Context

### `historical_average_delay`
- **Description**: The average historical delay observed at a specific station across all trains.
- **Source**: `public_historical_delay_clean.csv` (DA323) -> `avg_delay_minutes`
- **Data Type**: Numeric (Float)
- **Time Semantics**: Aggregated over an unspecified historical window.
- **Observation Level**: Station-level aggregated statistic.
- **Available Now?**: YES
- **Limitations**: Temporal provenance is unknown. It cannot be mathematically proven to not contain future information relative to a simulated past prediction.

### `percent_right_time`
- **Description**: Percentage of historical arrivals that were on-time at a station.
- **Source**: `public_historical_delay_clean.csv` (DA323) -> `percent_right_time`
- **Data Type**: Numeric (Float)
- **Time Semantics**: Aggregated over an unspecified historical window.
- **Observation Level**: Station-level aggregated statistic.
- **Available Now?**: YES
- **Limitations**: Same temporal provenance limitations as average delay.

### `percent_significant_delay`
- **Description**: Percentage of historical arrivals that were significantly delayed at a station.
- **Source**: `public_historical_delay_clean.csv` (DA323) -> `percent_significant_delay`
- **Data Type**: Numeric (Float)
- **Time Semantics**: Aggregated over an unspecified historical window.
- **Observation Level**: Station-level aggregated statistic.
- **Available Now?**: YES
- **Limitations**: Same temporal provenance limitations as average delay.

## 3. Uncollected (Missing) Data

### `actual_arrival_time`
- **Description**: The exact timestamp a train physically arrived at a station.
- **Observation Level**: Individual train event.
- **Available Now?**: NO.
- **Limitations**: Blocks all ML training.

### `historical_train_trajectory`
- **Description**: A time-series array of delay measurements for a single train journey.
- **Observation Level**: Individual train time-series.
- **Available Now?**: NO.
- **Limitations**: Blocks measurement of true delay recovery.
