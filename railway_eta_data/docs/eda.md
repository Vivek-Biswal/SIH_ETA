# Exploratory Data Analysis (EDA) Report

This document presents the findings from the Exploratory Data Analysis (Group A - Chunk 2).

## 1. Objective
To understand the underlying structure, characteristics, and relationships within the SIH Indian Train ETA datasets while scientifically confirming ML readiness and data limitations. This EDA does not modify raw datasets or generate synthetic ML targets.

## 2. Datasets Analyzed
- `trains_clean.json`: Train characteristics and schedule metadata.
- `stations_clean.json`: Station geography and zones.
- `schedules_clean.json`: Scheduled stops.
- `journeys_scheduled.json`: Reconstructed scheduled sequences.
- `public_historical_delay_clean.csv` (DA323): Historical aggregated delay statistics.
- `delays_clean.json` (Railpull): Snapshot of live delays.

## 3. Data Availability
- **Trains**: 5,208 records, 21 columns
- **Stations**: 8,990 records, 8 columns
- **Schedules**: 416,636 records, 8 columns
- **Journeys**: 5,208 sequences
- **Historical Aggregated (DA323)**: 1,479 records
- **Live Snapshot**: 444 records

## 4. Train Analysis
We observed 5,208 unique train numbers. Trains display varying scheduled durations and distances, providing good static feature candidates for future modelling. 
*(See `reports/eda/figures/train_types_distribution.png`)*

## 5. Station Analysis
With 8,990 stations, the network coverage is immense. A subset of stations lacks coordinates, but State and Railway Zone data is highly populated. 
*(See `reports/eda/figures/station_zone_dist.png`)*

## 6. Schedule Analysis
Schedules dictate arrival and departure times per stop. Time-of-day features (e.g. `dep_hour`) and multi-day indicators (`day`) can be successfully extracted.
*(See `reports/eda/figures/departure_hour_dist.png`)*

## 7. Journey Analysis
The Reconstructed Journeys provide the required logical flow. Stops per journey range significantly depending on the train class.

## 8. Route Analysis
By observing sequence bounds, we have determined that structural features like `Stop Count` and `Average Distance Between Stops` are extractable.
*(See `reports/eda/figures/route_stop_count_dist.png`)*

## 9. Historical Aggregated Delay Analysis
The DA323 dataset provides average delays for specific `station_code` matching. However, these are pre-calculated aggregations, meaning they can only act as background context, not explicit observation rows.
*(See `reports/eda/figures/historical_avg_delay_dist.png`)*

## 10. Live Snapshot Analysis
The `delays_clean.json` dataset represents exactly one point in time for 444 trains. It does not provide historical sequential time-series data. 

## 11. Cross-Dataset Compatibility
- **TRAINS <-> SCHEDULES**: 100% matched by `train_number`.
- **STATIONS <-> SCHEDULES**: 100% matched by `station_code`.
- **STATIONS <-> DA323**: ~97% match by `station_code`.
- **TRAINS <-> LIVE_DELAYS**: ~48% matched by `train_number` (444 live trains observed).

## 12. Key Patterns
- Train routes are mostly static and well-structured in schedules.
- Live telemetry is incredibly sparse natively.
- Delay risk can be historically inferred per station using DA323.

## 13. Candidate Features
Features discovered are cataloged in `docs/feature_candidates_eda.md` and `reports/eda/feature_availability_matrix.csv`. Categories include STATIC, TIME, ROUTE, and HISTORICAL_AGGREGATED context.

## 14. Data Limitations
The most crucial limitation is the absence of **Historical Individual Delay Records** (i.e. we do not have logs showing when train 123 arrived at station B yesterday, last week, or last year). We only possess scheduled routes and aggregated averages.

## 15. ML Readiness
**WHAT WE CAN DO:**
- Baseline system design
- Static railway network analysis
- Feature discovery & extraction based on schedules
- Historical aggregated risk modeling

**WHAT WE CANNOT SCIENTIFICALLY DO YET:**
- Train a supervised dynamic ETA model
- Predict actual future arrival using validated ground truth
- Evaluate true ETA accuracy using MAE/RMSE

*Reason:*
The current dataset lacks sufficient historical individual observations containing properly time-aligned train states, observation timestamps, and actual future arrivals.
