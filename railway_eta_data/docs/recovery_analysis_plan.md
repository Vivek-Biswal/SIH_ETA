# Recovery Analysis Plan

> Historical preparation snapshot. Statements about data availability,
> implementation and next steps describe the `railway_eta_data` preparation
> stage. For the current trained pilot and application status, see the
> [model audit](../../docs/ETA_MODEL_AUDIT.md) and
> [feature status](../../docs/FEATURE_STATUS.md).

## Status: FRAMEWORK ONLY — Not Currently Computable

The current project does NOT contain individual time-aligned delay sequences for trains.
Recovery analysis requires at minimum 2 timestamped delay observations per train journey.
The current `delays_clean.json` contains only a single snapshot per train.

---

## 1. What Recovery Means

Delay recovery is defined as:

```
delay_change  = delay_at_T2 - delay_at_T1
recovery      = delay_at_T1 - delay_at_T2   (positive = train recovered time)
```

A train is considered to have **recovered** if its delay decreased between observation T1 and T2.
A train is considered to have **worsened** if its delay increased between T1 and T2.

---

## 2. Future Data Requirements

To compute actual recovery, each training observation must include:

| Field | Description |
|---|---|
| `train_number` | Unique train identifier |
| `observation_timestamp` | ISO timestamp of the observation |
| `current_station` | Station code where the observation was made |
| `current_delay_minutes` | Delay at this observation point |
| `next_station` | Next scheduled stop |

For a recovery measurement:
- At least 2 such records per journey per train are needed.
- The timestamps must be in correct chronological order.
- Both observations must be from the same physical journey (same date).

---

## 3. Implementation Interface

The `recovery.py` module provides:

- `DelayObservationPair`: validated dataclass for a T1/T2 pair
- `calculate_delay_change(pair)`: validated delay change computation
- `check_recovery_feasibility(counts)`: determines if enough data exists

---

## 4. What Is Currently Possible vs Not Possible

| Capability | Status |
|---|---|
| Recovery framework | ✓ READY |
| Recovery data contract | ✓ READY |
| Recovery validators | ✓ READY |
| Actual recovery measurement | ✗ BLOCKED — no time series |
| Recovery rate estimation | ✗ BLOCKED — no time series |
| Recovery prediction | ✗ BLOCKED — no model-training data |
