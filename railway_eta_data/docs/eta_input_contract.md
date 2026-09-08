# ETA Input Contract

This document specifies the exact fields accepted by the ETA prediction interface, their types, availability, and sources.

---

## Request Fields

| Field | Description | Type | Required | Currently Available? | Source |
|---|---|---|---|---|---|
| `train_number` | The train number (e.g. "12001") | `str` | ✓ Yes | ✓ Yes | `trains_clean.json` |
| `destination_station` | Station code of the target stop (e.g. "NDLS") | `str` | ✓ Yes | ✓ Yes | `schedules_clean.json`, `stations_clean.json` |
| `current_delay_minutes` | Current delay in minutes at time of prediction | `float` (optional) | ✗ Optional | ✓ Partial (snapshot only) | `delays_clean.json` or live RailRadar API |
| `current_station` | Station code where the train currently is | `str` (optional) | ✗ Optional | ✗ Not reliably available | Live API (not stored historically) |
| `prediction_timestamp` | The datetime when the prediction is being made | `datetime` (optional) | ✗ Optional | ✓ Yes (system clock) | System |

---

## Output Fields

| Field | Description | Type | Populated When |
|---|---|---|---|
| `train_number` | Echo of the input train number | `str` | Always |
| `destination_station` | Echo of the destination | `str` | Always |
| `scheduled_arrival` | Timetable arrival time (HH:MM:SS) | `str` or `None` | Route is valid |
| `scheduled_day` | Journey day number (1.0 = first day, 2.0 = second day) | `float` or `None` | Route is valid |
| `predicted_arrival` | The estimated arrival time (HH:MM:SS) | `str` or `None` | Route is valid and status is OK |
| `predicted_day` | Predicted day number (accounting for delay overflow) | `float` or `None` | Status is OK |
| `current_delay_minutes` | The delay that was applied | `float` or `None` | DELAY_ADJUSTED_BASELINE only |
| `prediction_method` | Which baseline produced the estimate | `str` | Always |
| `status` | Result code: OK / ERROR / INVALID_DESTINATION / MISSING_SCHEDULE | `str` | Always |
| `assumptions` | List of documented assumptions made by the baseline | `list[str]` | Status is OK |
| `message` | Human-readable error or warning message | `str` or `None` | status != OK |

---

## Notes on Time Format

All times use `HH:MM:SS` 24-hour format. Times may exceed 24:00 (e.g. `25:30:00`) when an overnight delay causes arrival to cross midnight — this is intentional and preserves arithmetic correctness. The `scheduled_day` and `predicted_day` fields track which calendar day a stop occurs on relative to journey start.

**Timezone**: All times are assumed to be **Indian Standard Time (IST, UTC+5:30)**. The source schedules do not carry explicit timezone data; this is the documented project assumption.

---

## Currently Supported vs Future Required

**Currently Supported:**
- `train_number` + `destination_station` → SCHEDULE_BASELINE
- Adding `current_delay_minutes` → DELAY_ADJUSTED_BASELINE

**Future Required (not yet collectible):**
- `current_station` from a live tracking feed → enables position-aware ETA
- Time-series of `current_delay_minutes` → enables delay trajectory modelling
- `actual_arrival_time` (post-hoc) → enables model evaluation with MAE/RMSE
