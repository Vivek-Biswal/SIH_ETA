# ETA Request Contract

This document defines the canonical interface for requesting an ETA prediction from the core computational system.

## Standard Input Request

```json
{
  "train_number": "12001",
  "destination_station": "NDLS",
  "request_timestamp": "2026-09-08T10:00:00Z",
  "current_delay_minutes": 30.5
}
```

## Fields

### REQUIRED INPUTS
- `train_number` (String): The unique identifier for the train (e.g., "12001"). Must exist in `trains_clean.json`.
- `destination_station` (String): The station code of the target destination (e.g., "NDLS"). Must exist in the scheduled journey.

### OPTIONAL INPUTS
- `request_timestamp` (ISO 8601 String): When the prediction is requested. Defaults to current system UTC time.
- `current_delay_minutes` (Float): The most recently observed delay of the train. If provided, triggers the `DELAY_ADJUSTED_BASELINE`. If missing, system falls back to `SCHEDULE_BASELINE`.

### FUTURE INPUTS (Currently Not Fully Supported)
- `current_station` (String): The station the train was last observed at.
- `live_telemetry` (Object): `{lat, lon, speed, heading}`.

## Validation Rules
1. `train_number` must not be empty and must be known to the system.
2. `destination_station` must be on the train's scheduled route.
3. Negative `current_delay_minutes` is accepted (indicating early arrival) but capped at reasonable values (-60).

Any validation failure will return a structured error response, preventing silent failures or fabricated ETAs.
