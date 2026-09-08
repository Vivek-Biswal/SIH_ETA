# Feature Contract

This document formally defines every feature extractable in the current framework, its source, availability, and leakage status.

## 1. Static Features

**Feature**: `train_type`
- **Description**: Broad category of the train (e.g., Shatabdi, Express).
- **Source Dataset**: `trains_clean.json`
- **Source Column**: `type`
- **Data Type**: Categorical (String)
- **Calculation**: Direct extraction.
- **Availability**: STATIC_AVAILABLE
- **Temporal Validity**: Valid for all journeys of this train number.
- **Leakage Risk**: SAFE

**Feature**: `route_distance`
- **Description**: Total scheduled distance for the entire journey in km.
- **Source Dataset**: `trains_clean.json`
- **Source Column**: `distance`
- **Data Type**: Numeric
- **Calculation**: Direct extraction.
- **Availability**: STATIC_AVAILABLE
- **Temporal Validity**: Valid for all journeys.
- **Leakage Risk**: SAFE

**Feature**: `scheduled_duration`
- **Description**: Total scheduled journey time (hours).
- **Source Dataset**: `trains_clean.json`
- **Source Column**: `duration_h`, `duration_m`
- **Data Type**: Numeric
- **Calculation**: `duration_h + (duration_m / 60.0)`
- **Availability**: STATIC_AVAILABLE
- **Temporal Validity**: Valid for all journeys.
- **Leakage Risk**: SAFE

## 2. Station Context Features

**Feature**: `station_state`
- **Description**: Geographic state of the station.
- **Source Dataset**: `stations_clean.json`
- **Source Column**: `state`
- **Data Type**: Categorical
- **Calculation**: Direct extraction based on station code.
- **Availability**: STATIC_AVAILABLE
- **Temporal Validity**: Valid always.
- **Leakage Risk**: SAFE

**Feature**: `railway_zone`
- **Description**: Administrative railway zone.
- **Source Dataset**: `stations_clean.json`
- **Source Column**: `zone`
- **Data Type**: Categorical
- **Calculation**: Direct extraction based on station code.
- **Availability**: STATIC_AVAILABLE
- **Temporal Validity**: Valid always.
- **Leakage Risk**: SAFE

## 3. Time Features (Schedule-based)

**Feature**: `scheduled_departure_hour`
- **Description**: Hour of the day the train is scheduled to depart (0-23).
- **Source Dataset**: `journeys_scheduled.json`
- **Source Column**: `scheduled_departure`
- **Data Type**: Numeric (Integer)
- **Calculation**: Parsed from HH:MM:SS strings.
- **Availability**: SCHEDULE_AVAILABLE
- **Temporal Validity**: Valid as static plan context.
- **Leakage Risk**: SAFE (as long as it is treated as schedule time, not actual departure time).

**Feature**: `journey_day`
- **Description**: Day offset from journey origin.
- **Source Dataset**: `journeys_scheduled.json`
- **Source Column**: `day`
- **Data Type**: Numeric
- **Calculation**: Direct extraction.
- **Availability**: SCHEDULE_AVAILABLE
- **Temporal Validity**: Valid as static plan context.
- **Leakage Risk**: SAFE

## 4. Route Features

**Feature**: `stop_count`
- **Description**: Total number of scheduled stops on the train's route.
- **Source Dataset**: `journeys_scheduled.json`
- **Source Column**: Route length.
- **Data Type**: Numeric
- **Calculation**: Count of stops in the journey array.
- **Availability**: SCHEDULE_AVAILABLE
- **Temporal Validity**: Valid always for the schedule version.
- **Leakage Risk**: SAFE

**Feature**: `average_distance_between_stops`
- **Description**: Route Distance divided by Stop Count.
- **Source Dataset**: `trains_clean.json`, `journeys_scheduled.json`
- **Source Column**: Derived
- **Data Type**: Numeric
- **Calculation**: `route_distance / max(1, stop_count - 1)`
- **Availability**: SCHEDULE_AVAILABLE
- **Temporal Validity**: Valid always.
- **Leakage Risk**: SAFE

## 5. Historical Aggregated Features

**Feature**: `historical_average_delay`
- **Description**: The historically averaged delay for a specific station (from DA323).
- **Source Dataset**: `public_historical_delay_clean.csv`
- **Source Column**: `Avg Delay (min)`
- **Data Type**: Numeric
- **Calculation**: Direct extraction for a matching station code.
- **Availability**: HISTORICAL_CONTEXT
- **Temporal Validity**: TEMPORALLY_UNSAFE_OR_UNKNOWN. The exact time bounding of DA323 is unknown. It cannot be mathematically proven that it does not contain future information relative to a simulated past prediction.
- **Leakage Risk**: UNSAFE for direct ML training targets or individual dynamic state. Usable ONLY as broad geographical context.

## 6. Live Features

**Feature**: `current_delay_minutes`
- **Description**: The delay of the train at prediction time.
- **Source Dataset**: `delays_clean.json` (or future live stream)
- **Source Column**: `delay`
- **Data Type**: Numeric
- **Calculation**: Direct extraction based on live snapshot.
- **Availability**: LIVE_AVAILABLE
- **Temporal Validity**: Valid ONLY exactly at `prediction_timestamp`.
- **Leakage Risk**: CONDITIONALLY_SAFE. Requires strict alignment with the prediction timestamp to avoid using future delay.
