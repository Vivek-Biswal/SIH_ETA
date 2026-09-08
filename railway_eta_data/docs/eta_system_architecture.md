# ETA System Architecture

This document describes the current and planned future architecture of the SIH Indian Train ETA system.

---

## Current System Architecture

```mermaid
flowchart TD
    A[Static Railway Timetable\nschedules_clean.json] --> B[Journey Reconstruction\nsrc/journey/reconstruct.py]
    B --> C[journeys_scheduled.json\n5208 train routes]
    C --> D[ETA Baseline Engine\nsrc/eta/predictor.py]

    E[User Request\ntrain_number + destination] --> D
    F[Current Delay\noptional, live snapshot] --> D

    D --> G{Baseline Selector}
    G -->|delay is None| H[Schedule Baseline\nETA = Scheduled Arrival]
    G -->|delay provided| I[Delay-Adjusted Baseline\nETA = Scheduled + Delay]

    H --> J[ETAPrediction Output\nmethod, eta, assumptions]
    I --> J
```

**Constraints of the Current System:**
- All ETA estimates are based on static timetable data
- No live position tracking
- No ML model; fully deterministic
- Cannot be evaluated for accuracy (no actual arrival ground truth)

---

## Future System Architecture (when historical data is available)

```mermaid
flowchart TD
    A[Live Train State Stream\nPosition, Delay, Speed, Timestamp] --> B[Feature Engineering\nSegment Progress, Route Context]
    C[Historical Journey Dataset\nPast States + Actual Arrivals] --> D[ML Model Training\nGradient Boosting / LSTM]
    B --> D
    E[Static Route Features\nSchedule, Distance, Zone] --> D

    D --> F[Trained ETA Model]
    G[Real-Time Request\ntrain + position + delay] --> F
    F --> H[Predicted ETA\nwith confidence interval]

    H --> I[Evaluation Pipeline\nMAE / RMSE / Bias]
    J[Actual Arrival Records\ncollected post-prediction] --> I
```

**Requirements for Future System:**
- Continuous ingestion of live train state (position, delay, speed, timestamp)
- Storage of historical individual journey records with verified actual arrivals
- Minimum dataset size: ~30 journeys × 500+ trains across multiple seasons
- Rigorous train/test split to prevent data leakage

---

## Transition Plan

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Data ingestion, cleaning, validation | ✓ Complete |
| Phase 1 | Journey reconstruction + EDA | ✓ Complete |
| Phase 2 | Schedule-based ETA baselines | ✓ Complete (Chunk 3) |
| Phase 3 | Live data collection pipeline (sustained) | ⏳ Not started |
| Phase 4 | Historical dataset assembly + feature engineering | ⏳ Blocked on Phase 3 |
| Phase 5 | ML model training + evaluation | ⏳ Blocked on Phase 4 |
