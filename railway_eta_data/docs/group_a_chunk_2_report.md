# Group A - Chunk 2 Report: Exploratory Data Analysis (EDA)

This document serves as the final report for the completion of Group A Chunk 2 of the SIH Indian Train ETA Project.

## 1. Work Completed
- Created a modular, reproducible EDA architecture within `src/eda/`.
- Executed exploratory analysis over trains, stations, schedules, routes, and delay datasets.
- Handled structural dataset analyses safely without fabricating actual history or training ML models.
- Produced summary figures for train types, schedule durations, geographical distribution, and arrival patterns.
- Created robust feature candidates documentation alongside an availability matrix to prevent data leakage in future steps.

## 2. Files Created
**Source Code:**
- `src/eda/__init__.py`: Module initializer.
- `src/eda/overview.py`: Dataset counting and high-level type mapping.
- `src/eda/train_analysis.py`: Extracted distance and duration distributions.
- `src/eda/station_analysis.py`: Analyzed geographic zones and coordinates.
- `src/eda/schedule_analysis.py`: Binned peak departure hours.
- `src/eda/route_analysis.py`: Mapped stops per journey.
- `src/eda/delay_analysis.py`: Analyzed DA323 aggregations safely and measured live Railpull snapshot properties.
- `src/eda/cross_dataset_analysis.py`: Validated joins across dataset primary keys.
- `src/run_eda.py`: The master execution script orchestrating the logic cleanly.
- `tests/test_eda.py`: Validated aggregation and join mapping logic.

**Documentation:**
- `docs/eda.md`: Full multi-section analytical summary and ML readiness declaration.
- `docs/feature_candidates_eda.md`: Cataloged static, time, route, and contextual candidate features.

**Reports:**
- `reports/eda/dataset_overview.csv`: Overview matrix.
- `reports/eda/join_analysis.csv`: Cross-table matching percentages.
- `reports/eda/feature_availability_matrix.csv`: Tabular matrix of feature safety/leakage risk.
- `reports/eda/figures/*.png`: 6 visual charts supporting findings.

## 3. Files Modified
- None of the raw or primary processed datasets were modified. The analysis was strictly read-only.

## 4. Datasets Analyzed
- `trains_clean.json` (STATIC)
- `stations_clean.json` (STATIC)
- `schedules_clean.json` (STATIC)
- `journeys_scheduled.json` (STATIC)
- `public_historical_delay_clean.csv` (HISTORICAL_AGGREGATED)
- `delays_clean.json` (LIVE_SNAPSHOT)

## 5. Major Findings
- The `train_number` and `station_code` primary keys serve as a robust 100% backbone for linking trains, schedules, and journeys.
- There are substantial geographic patterns, with the vast majority of stations carrying State/Zone mapping, enabling regional routing modeling.
- The route distances and schedule hours are richly populated, acting as ideal candidates for static/topological modeling features.

## 6. Join Compatibility
- **TRAINS ↔ SCHEDULES**: 100%
- **STATIONS ↔ SCHEDULES**: 100%
- **STATIONS ↔ DA323**: ~97%
- **TRAINS ↔ LIVE DELAYS**: ~48% (Reflects the snapshot nature of live data, seeing only 444 trains actively tracked).

## 7. Data Limitations
The most important limitation mathematically verified is the absence of historical sequential time-series actual movement data. Because we only have static schedules and abstract aggregated historical averages (DA323), we lack individual time-aligned observations mapping a train's past states to its actual outcome.

## 8. ML Readiness Status
- **Ready for**: EDA, Network Analysis, Feature Engineering (Static & Scheduled), and Baseline Network Topology Design.
- **NOT Ready for**: Supervised dynamic ML training (e.g. Random Forests / LSTMs targeting ETA) due to lack of ground-truth target variable logs, which prevents valid loss measurement (MAE/RMSE).

## 9. Test Results
`pytest tests/test_eda.py` passes completely, ensuring the custom join-mapping algorithms and feature extractors operate deterministically.

## 10. Ready for Chunk 3
The dataset characteristics, features, and strict scientific ML bounds are fully mapped. We are ready to proceed to the next Chunk.
