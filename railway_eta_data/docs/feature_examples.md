# Feature Record Examples

This document demonstrates the output of the Feature Builder and how records conceptually differ depending on the available data.

## 1. Static/Schedule Feature Record
These features can be built immediately for any scheduled journey, without requiring real-time updates.

```json
{
  "train_number": "12001",
  "destination_station": "NDLS",
  "train_type": "Shatabdi",
  "route_distance": 705.0,
  "scheduled_duration_hours": 8.5,
  "stop_count": 8,
  "average_distance_between_stops": 100.71,
  "destination_state": "Delhi",
  "destination_zone": "NR",
  "destination_historical_avg_delay": 15.5
}
```

## 2. Incomplete Dynamic Prediction Record
This represents a prediction context. Because we lack verified historical time-aligned observations (live train state combined with future actual arrival), this record is incomplete.

```json
{
  "train_number": "12001",
  "prediction_timestamp": "2026-09-08T14:30:00Z",
  "current_station": null,
  "current_delay_minutes": 45.0,
  "current_speed": null,
  "actual_arrival_time": null,
  "prediction_context_complete": false,
  
  "train_type": "Shatabdi",
  "route_distance": 705.0,
  "scheduled_duration_hours": 8.5,
  "stop_count": 8,
  "average_distance_between_stops": 100.71,
  "destination_station": "NDLS",
  "destination_state": "Delhi",
  "destination_zone": "NR",
  "destination_historical_avg_delay": 15.5
}
```

### Missing Fields Explained:
- `current_station`: Not tracked in our current live delay snapshot.
- `current_speed`: Not available in RailRadar or NTES public data at scale.
- `actual_arrival_time`: The ground truth target. Missing because we do not have a historical record of what actually happened to this train after the prediction was made.
