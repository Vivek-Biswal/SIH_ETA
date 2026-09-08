# ETA Baselines Documentation

## 1. Objective

This module implements scientifically honest ETA baselines for Indian train arrival estimation. These baselines operate entirely on available static timetable and live snapshot data. They do not use machine learning and do not require verified historical actual arrival records.

---

## 2. Scientific Constraint

The current dataset **does not contain verified actual arrival timestamps** for individual journeys. Therefore:

- ✗ No supervised ML model can be trained
- ✗ No MAE/RMSE can be calculated against real ground truth
- ✗ Scheduled arrivals cannot be treated as ground truth

The baselines in this module are **deterministic estimates** — they are transparent, reproducible, and clearly document all assumptions they make.

---

## 3. ETA Definition

| Term | Definition |
|---|---|
| Scheduled Arrival | Timetable arrival time (static, fixed) |
| Estimated Arrival (ETA) | System-generated estimate based on available inputs |
| Actual Arrival | Real-world verified observation (NOT currently available) |
| Prediction Timestamp | The moment the ETA is computed |

See [`eta_definition.md`](eta_definition.md) for full definitions.

---

## 4. Available Data

| Dataset | Type | Used For |
|---|---|---|
| `schedules_clean.json` | STATIC | Timetable lookup |
| `journeys_scheduled.json` | STATIC | Route sequence and stop ordering |
| `delays_clean.json` | LIVE_SNAPSHOT | Optional delay input |
| `stations_clean.json` | STATIC | Station validation |

---

## 5. Baseline 1 — Schedule Baseline

**Name**: `SCHEDULE_BASELINE`

**Logic**: Return the scheduled arrival directly from the timetable.

```
ETA = Scheduled Arrival at Destination
```

**When used**: When no current delay information is available.

**Output**: Exactly the timetable value. No adjustment.

**Limitation**: Ignores all current conditions (delays, disruptions).

---

## 6. Baseline 2 — Delay-Adjusted Baseline

**Name**: `DELAY_ADJUSTED_BASELINE`

**Logic**: Add the current live delay to the scheduled arrival.

```
ETA = Scheduled Arrival + Current Delay (minutes)
```

**When used**: When a valid `current_delay_minutes` value is provided.

**Requirement**: Delay MUST come from a live source (RailRadar / Railpull). Never use DA323 historical averages as the delay input.

**Handles**: Overnight overflow — if delay pushes arrival past midnight, the predicted day is incremented.

**Limitation**: Assumes delay is constant. No recovery or accumulation modelled.

---

## 7. Input Contract

See [`eta_input_contract.md`](eta_input_contract.md) for full field documentation.

**Minimum required fields**: `train_number`, `destination_station`

**Optional fields**: `current_delay_minutes`, `current_station`, `prediction_timestamp`

---

## 8. Output Contract

All baselines return an `ETAPrediction` with:

| Field | Description |
|---|---|
| `train_number` | Input train number |
| `destination_station` | Input destination |
| `scheduled_arrival` | Timetable arrival time |
| `scheduled_day` | Journey day (1.0, 2.0, …) |
| `predicted_arrival` | Adjusted ETA |
| `predicted_day` | Adjusted day |
| `current_delay_minutes` | Applied delay (or None) |
| `prediction_method` | Which baseline was selected |
| `status` | OK / ERROR / INVALID_DESTINATION / MISSING_SCHEDULE |
| `assumptions` | List of assumptions made |
| `message` | Error details (if status != OK) |

---

## 9. Assumptions

See [`eta_baseline_assumptions.md`](eta_baseline_assumptions.md) for comprehensive per-baseline assumption lists.

---

## 10. Limitations

- Baselines do not account for partial delay recovery
- Baselines do not model segment-level delay accumulation  
- No cancellation detection is implemented
- Single-destination predictions only; multi-stop sequencing not supported
- The delay snapshot may be stale by the time of prediction

---

## 11. Evaluation Status

> ❌ Accuracy evaluation (MAE, RMSE) is **not possible** with the current dataset.
>
> Actual arrival timestamps are required. See [`future_eta_evaluation_plan.md`](future_eta_evaluation_plan.md).

---

## 12. Future ML Architecture

See [`eta_system_architecture.md`](eta_system_architecture.md) for the planned transition from deterministic baselines to a trained ML ETA model, including all data collection prerequisites.
