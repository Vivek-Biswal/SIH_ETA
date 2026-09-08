# Leakage-Safe Feature Engineering Framework

## 1. Objective
To construct a modular, reproducible, and mathematically safe feature engineering pipeline for the SIH Indian Train ETA Project, strictly adhering to temporal causality rules.

## 2. Current Data Constraints
- **No Historical Individual Observations**: We do not possess time-series records of individual train movements linked to their actual future arrival times.
- **Consequence**: ML targets (labels) cannot be legally constructed. Any attempt to build an ML model on this data would require fabricating actual arrivals (fraud) or using scheduled arrivals as targets (scientifically invalid).
- **Goal**: Build the feature extraction logic so that when legal telemetry data is acquired, the pipeline is ready.

## 3. Feature Categories
Features are classified by their temporal availability:
- `STATIC_AVAILABLE`: Fixed properties (distance, type).
- `SCHEDULE_AVAILABLE`: Derived from timetables.
- `LIVE_AVAILABLE`: Telemetry at prediction time.
- `HISTORICAL_CONTEXT`: Pre-aggregated statistics.
- `FUTURE_REQUIRED`: Uncollected ground truth.

## 4. Static Features
Extracted directly from `trains_clean.json`:
- `train_type`
- `route_distance`
- `scheduled_duration_hours`

## 5. Schedule Features
Derived from `journeys_scheduled.json`:
- `scheduled_departure_hour`
- `journey_day`

## 6. Route Features
Calculated from the reconstructed schedule topologies:
- `stop_count`
- `average_distance_between_stops`

## 7. Station Context Features
Sourced from `stations_clean.json`:
- `destination_state`
- `destination_zone`

## 8. Historical Aggregated Context
Sourced from `public_historical_delay_clean.csv` (DA323):
- `destination_historical_avg_delay`
- **Leakage Status**: `TEMPORALLY_UNSAFE_OR_UNKNOWN`. We cannot prove this aggregation does not contain information from the "future" relative to a simulated prediction. Used only as a broad contextual proxy.

## 9. Live Features
Sourced from `delays_clean.json` (currently a single snapshot):
- `current_delay_minutes`

## 10. Feature Availability
See `reports/features/feature_registry.csv` for the exact availability map of all 11 defined features.

## 11. Join Validation
Join architecture relies on the lookups built in `src/eta/predictor.py` and `src/features/builder.py`.
- Trains ↔ Journeys: 5208 matched.
- Missing live data is handled safely (None) rather than imputed with future data.

## 12. Leakage Analysis
The `LeakageChecker` enforces rules:
1. No future info.
2. No actuals as features.
3. Live features require timestamps.
4. Aggregations require provenance.
All extracted features are evaluated against these rules.

## 13. Feature Quality
See `reports/features/feature_quality_report.csv` for missing value percentages and data types across a 1,000-record sample.

## 14. Current Feature Records
The `FeatureBuilder` correctly constructs `StaticFeatureRecord` and flags `DynamicPredictionFeatureRecord` as incomplete (`prediction_context_complete = False`).

## 15. Future Dynamic Features
When a live NTES/RailRadar feed is acquired alongside an archiving system, the following must be populated:
- `current_station`
- `current_speed`
- `actual_arrival_time` (recorded post-facto for training)

## 16. Limitations
- We cannot extract segment-level congestion metrics without live telemetry.
- DA323 data cannot be used dynamically.

## 17. ML Readiness
**WHAT IS READY:**
- Feature extraction architecture
- Static, schedule, and route feature definitions
- Leakage detection system
- Join validation and lookup mechanisms

**WHAT IS NOT READY:**
- Supervised ML Model Training. We lack actual arrival labels and time-aligned observations.
