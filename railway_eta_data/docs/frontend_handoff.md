# Frontend Handoff Contract (For SNEHA)

This document outlines how the frontend should display ETA information provided by the backend API.

## 1. Frontend Honesty Rule

The UI must accurately reflect the data source and prediction method. 

**DO NOT display:**
- "AI Prediction"
- "Machine Learning ETA"
- "Live GPS Tracking" (unless GPS is explicitly verified and added to the backend later)

**INSTEAD display:**
- "Schedule-based ETA" (if `prediction_method == SCHEDULE_BASELINE`)
- "Current-delay-adjusted ETA" (if `prediction_method == DELAY_ADJUSTED_BASELINE`)

## 2. Recommended UI Data Mapping

When the backend returns an `ETAResponse`, map the fields to the UI as follows:

| Backend Field | UI Representation | Notes |
|---|---|---|
| `train_number` | Train ID | e.g. "Train 12001" |
| `destination_station` | Destination | e.g. "NDLS" |
| `predicted_arrival` | **Estimated Arrival** | The main ETA time (e.g. 20:30) |
| `prediction_method` | Prediction Source | e.g. "Adjusted for live delay" |
| `current_delay_minutes` | Current Delay | "Train is delayed by X minutes" (Hide if null) |
| `data_completeness_status` | Data Status Indicator | E.g. a green dot for `DELAY_AVAILABLE`, gray dot for `SCHEDULE_ONLY` |

## 3. Handling Assumptions and Limitations

The `ETAResponse` object includes two arrays: `assumptions` and `limitations`.

- **Assumptions**: E.g., "The calculation assumes the current delay persists until the destination". 
  - *UI Recommendation*: Display these in an info tooltip (ℹ️ icon) next to the ETA.
- **Limitations**: E.g., "Live position is currently unavailable".
  - *UI Recommendation*: Display in a "Data Quality" or "Limitations" section if the user requests deeper details.

## 4. Handling Errors

If the backend returns `status: "ERROR"`, the UI should gracefully handle the `error_code` and `message`.
- E.g., `DESTINATION_NOT_FOUND` -> "The selected destination is not on this train's scheduled route."
