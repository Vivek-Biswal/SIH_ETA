# Group A - Chunk 4 Report: Leakage-Safe Feature Engineering

This document serves as the final report for Group A Chunk 4 of the SIH Indian Train ETA Project.

---

## 1. Work Completed
- Formalized feature contracts for all available data fields.
- Implemented a strict leakage detection framework.
- Built a modular feature extraction system (`src/features/`).
- Handled static, route, time, live, and historical features safely.
- Generated feature registries and quality reports.
- Proved that ML training is currently blocked by lack of ground truth labels.

---

## 2. Files Created
**Source Code (`src/features/`):**
- `__init__.py`
- `contract.py` — Dataclasses for static and dynamic records.
- `static_features.py`
- `route_features.py`
- `historical_features.py`
- `live_features.py`
- `leakage.py` — temporal evaluation logic.
- `builder.py` — feature record generator.

**Runners & Tests:**
- `src/run_feature_engineering.py`
- `tests/test_features.py`

**Documentation & Reports:**
- `docs/feature_contract.md`
- `docs/leakage_safe_features.md`
- `docs/feature_examples.md`
- `docs/feature_engineering.md`
- `reports/features/feature_registry.csv`
- `reports/features/feature_quality_report.csv`

---

## 3. Files Modified
None. Raw data and previously processed pipelines remain completely untouched.

---

## 4. Feature Categories
1. **STATIC_AVAILABLE**: 5 features (type, distance, duration, state, zone)
2. **SCHEDULE_AVAILABLE**: 2 features (stop count, avg distance between stops)
3. **LIVE_AVAILABLE**: 1 feature (current delay snapshot)
4. **HISTORICAL_CONTEXT**: 1 feature (DA323 avg delay)
5. **FUTURE_REQUIRED**: Target labels, current speed, GPS.

---

## 5. Join Validation Results
- Reconstructed journeys for 5,208 trains safely joined with static train metadata and destination station coordinates.
- Live delay joined cleanly but explicitly marked as conditionally safe due to missing timestamps.

---

## 6. Leakage Analysis Results
The `LeakageChecker` correctly identified DA323 (`historical_average_delay`) as `TEMPORALLY_UNSAFE_OR_UNKNOWN` (`UNSAFE` leakage risk) because the date range for the aggregation cannot be guaranteed to pre-date simulated predictions. It was prevented from contaminating the ML context silently.

---

## 7. Test Results
`tests/test_features.py` executed successfully.
**8/8 tests passed** covering:
- Static, route, and station context extractions.
- Leakage evaluation logic.
- The `FeatureBuilder` correctly flagging `prediction_context_complete = False` when dynamic target data is absent.
- The test suite overall remains at 100% passing.

---

## 8. Current ML Readiness
**Are we ready to train a supervised ETA model?**
**NO.**

**Reason:**
The project lacks properly time-aligned historical individual observations containing the actual future arrival. Without ground truth labels (`actual_arrival_time`), any model trained would be scientifically invalid or fraudulent.

---

## 9. What is ready for Chunk 5?
We now have:
- Clean data.
- Baseline models.
- Leakage-safe feature extraction.

We are ready to package the baselines, features, and analysis for final delivery or integration into a UI/API, while acknowledging the ML blocker.

**STOPPED**. No ML model trained. No synthetic data created.
