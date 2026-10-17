# Group A Final Scientific Report

> Historical preparation snapshot. Statements about data availability,
> implementation and next steps describe the `railway_eta_data` preparation
> stage. For the current trained pilot and application status, see the
> [model audit](../../docs/ETA_MODEL_AUDIT.md) and
> [feature status](../../docs/FEATURE_STATUS.md).

## 1. Executive Summary

Group A successfully reconstructed the scheduled train timetable logic, built deterministic ETA baselines, established safe feature engineering pipelines, and profiled historical delay behaviors.

Critically, **Group A enforces scientific honesty.** Because the current datasets completely lack historical, time-aligned, individual train movement trajectories (telemetry), a supervised predictive model cannot be trained from these data. Instead of fabricating data or building pseudo-models, Group A built robust baseline predictors that explicitly expose their limitations to the end-user.

## 2. Core Contributions

### 2.1 Journey Reconstruction
Converted disparate train schedule files into sequential, day-offset journeys (`journeys_scheduled.json`). This forms the mathematical backbone for all downstream ETA predictions.

### 2.2 Deterministic ETA Baselines
Built the `SCHEDULE_BASELINE` and `DELAY_ADJUSTED_BASELINE` algorithms. These safely predict arrival times using known data, correctly wrapping around midnight and advancing day markers.

### 2.3 Feature Engineering & Leakage Prevention
Developed a modular pipeline to extract static, route, and historical features. Implemented a strict `LeakageChecker` to categorically prevent aggregated historical datasets (like DA323) from bleeding into live prediction models.

### 2.4 Delay-DNA
Analyzed the limited delay snapshots to categorize delays. While we laid the programmatic framework for analyzing delay *recovery*, the calculation is intentionally blocked until the backend engineers provide continuous time-series data.

### 2.5 System Integration
Wrapped all modules into a `TrainStateBuilder` and `ETAOrchestrator`, providing standardized API contracts (JSON) that the backend teams can ingest immediately. Every ETA response strictly defines the assumptions and limitations of the prediction.

## 3. Data Integrity & Security Status

- **Raw Data Unchanged:** PASS
- **Unsupported Model Claims Blocked:** PASS (No synthetic data generation; no pseudo-models).
- **Temporal Leakage Blocked:** PASS (DA323 isolated).

## 4. Required Next Steps for Group B & C

1. **Backend Integration:** Varun's team must hook up the `ETAOrchestrator` to HTTP routes and database stores.
2. **Time-Series Data Collection:** The backend *must* implement continuous tracking of train progress. Without logging historical actual arrival times, model training on these observations will not be possible.
3. **Frontend Honesty:** Sneha's team must use the `prediction_method`, `assumptions`, and `limitations` fields to accurately communicate the nature of the ETA to users. The UI must not label deterministic baselines as trained-model predictions.
