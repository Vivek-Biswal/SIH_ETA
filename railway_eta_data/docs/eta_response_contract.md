# ETA Response Contract

This document defines the canonical interface for ETA responses returned by the core computational system.

## Standard Output Response

```json
{
  "train_number": "12001",
  "destination_station": "NDLS",
  "predicted_arrival": "20:30:00",
  "prediction_method": "DELAY_ADJUSTED_BASELINE",
  "current_delay_minutes": 30.0,
  "data_completeness_status": "DELAY_AVAILABLE",
  "assumptions": [
    "The calculation assumes the current delay persists until the destination without recovery or further delay."
  ],
  "limitations": [
    "Live position, speed, and actual historical trajectories are currently unavailable."
  ],
  "status": "OK"
}
```

## Fields

- `train_number` (String): Echoed from request.
- `destination_station` (String): Echoed from request.
- `predicted_arrival` (String): `HH:MM:SS` format. Note: Cross-day logic pushes this to subsequent days without altering the time format.
- `prediction_method` (String): Explicitly declares how the ETA was derived.
  - `SCHEDULE_BASELINE`: Purely from published timetable.
  - `DELAY_ADJUSTED_BASELINE`: Timetable + observed delay.
  - **CRITICAL**: The phrase "ML prediction" is strictly forbidden until a valid model exists.
- `current_delay_minutes` (Float | null): The delay used in the calculation, if applicable.
- `data_completeness_status` (String): Indicates input quality (e.g., `SCHEDULE_ONLY`, `DELAY_AVAILABLE`). Do NOT treat this as a statistical confidence interval.
- `assumptions` (List[String]): Explicit list of mathematical/logical assumptions made during calculation. Must be exposed to the user.
- `limitations` (List[String]): Explicit list of system data deficiencies affecting the prediction.
- `status` (String): `OK` if successful.

## Error Response

```json
{
  "status": "ERROR",
  "error_code": "DESTINATION_NOT_FOUND",
  "message": "Destination CSTM not found in scheduled route."
}
```

### Known Error Codes:
- `TRAIN_NOT_FOUND`
- `DESTINATION_NOT_FOUND`
- `INVALID_REQUEST`
- `SYSTEM_ERROR`
