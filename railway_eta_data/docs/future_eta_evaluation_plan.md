# Future ETA Evaluation Plan

This document describes how ETA prediction accuracy should be evaluated once verified historical actual arrival data becomes available. It explicitly confirms that evaluation **cannot be performed now** using the current dataset.

---

## Why Evaluation Cannot Be Performed Now

The current dataset provides:
- Static timetable schedules (planned arrivals)
- Aggregated historical delay statistics (DA323) — averages over many journeys
- Single-snapshot live delay data (444 trains, one point in time)

**None of these constitute individual verified actual arrival timestamps.**

Comparing our predictions against scheduled arrivals would be circular — the schedule is what both baselines use as input. It is not an independent ground truth.

---

## What Correct Evaluation Requires

For each prediction made, we need a corresponding actual observation:

```
┌─────────────────────────────────────────────┐
│  Prediction at t_predict:                   │
│    predict_eta(train, destination, delay)   │
│    → predicted_arrival = "14:45"            │
│                                             │
│  Later observation (t_actual_collected):    │
│    Actual arrival of train at destination   │
│    → actual_arrival = "14:52"               │
│                                             │
│  Error = actual - predicted = +7 minutes    │
└─────────────────────────────────────────────┘
```

Accumulate thousands of such (predicted, actual) pairs, then compute:

| Metric | Formula | Interpretation |
|---|---|---|
| **MAE** | `mean(|actual - predicted|)` | Average absolute error in minutes |
| **RMSE** | `sqrt(mean((actual - predicted)²))` | Penalises large errors more heavily |
| **Bias** | `mean(actual - predicted)` | Systematic over- or under-prediction |
| **Within-N-min accuracy** | `% of predictions within N minutes of actual` | Practical usefulness metric |

---

## How to Collect the Required Data

**Option A — Continuous Railpull / RailRadar Collection**
- Periodically call the RailRadar or Railpull API at 15–30 minute intervals
- Record: `train_number`, `current_station`, `current_delay`, `timestamp`
- Infer actual arrival at a destination when train is observed at that station
- Requires sustained collection over weeks/months to obtain a statistically meaningful dataset

**Option B — NTES (National Train Enquiry System) Scraping**
- NTES publishes live and historical train running history
- Requires legal verification and appropriate permissions

**Option C — Partnered Data Access**
- Indian Railways CRIS or Zonal Railways data centres may provide historical running records with proper research access (requires formal partnership)

---

## Minimum Dataset Requirements for Meaningful Evaluation

| Requirement | Target |
|---|---|
| Unique trains evaluated | ≥ 500 |
| Evaluation instances per train | ≥ 30 journeys |
| Spread of train types | Express, Superfast, Rajdhani, Passenger |
| Geographic spread | Multiple zones |
| Seasonal spread | At least 3 months |

---

## Current Status

> ❌ **MAE, RMSE, and MAPE cannot be calculated at this time.**
>
> There is no verified actual arrival data available in the current project scope.
> Any evaluation performed against scheduled arrivals would be scientifically invalid.
