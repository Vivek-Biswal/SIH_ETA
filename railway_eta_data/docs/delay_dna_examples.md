# Delay-DNA Examples

## 1. Current Delay Observation
Category: `OBSERVED_CURRENT`

```json
{
  "train_number": "12001",
  "delay_minutes": 45,
  "delay_category": "moderate",
  "snapshot_timestamp": "2026-09-06T18:30:40Z",
  "data_level": "OBSERVED_CURRENT",
  "note": "Single snapshot — not a historical trajectory"
}
```

## 2. Historical Aggregated Context
Category: `HISTORICAL_AGGREGATED`

```json
{
  "station_code": "NDLS",
  "avg_delay_minutes": 95.0,
  "percent_right_time": 15.0,
  "percent_significant_delay": 44.0,
  "temporal_status": "TEMPORALLY_UNKNOWN",
  "data_level": "HISTORICAL_AGGREGATED",
  "warning": "Temporal provenance of DA323 is unknown"
}
```

## 3. Static Route Context
Category: `STATIC_CONTEXT`

```json
{
  "train_number": "12001",
  "route_distance": 1400.0,
  "stop_count": 22,
  "scheduled_duration_hours": 16.5,
  "train_type": "Express",
  "data_level": "STATIC_CONTEXT"
}
```

## 4. Combined Delay-DNA Profile (Partial)
```json
{
  "train_number": "12001",
  "current_delay_minutes": 45,
  "delay_category": "moderate",
  "current_delay_status": "OBSERVED_CURRENT",
  "historical_avg_delay": 95.0,
  "historical_context_status": "HISTORICAL_AGGREGATED",
  "route_distance": 1400.0,
  "stop_count": 22,
  "route_context_status": "STATIC_CONTEXT",
  "actual_arrival_time": null,
  "historical_trajectory": null,
  "data_completeness_note": "Not suitable for ML training — actual arrivals missing"
}
```

## 5. Missing Live Data
```json
{
  "train_number": "99999",
  "current_delay_minutes": null,
  "current_delay_status": "NOT_AVAILABLE",
  "note": "This train was not present in the live snapshot"
}
```

## 6. Temporally Unknown Historical Statistic
```json
{
  "station_code": "CSTM",
  "avg_delay_minutes": 200.0,
  "temporal_status": "TEMPORALLY_UNKNOWN",
  "leakage_risk": "UNSAFE_FOR_ML",
  "reason": "Cannot prove this statistic was computed before the prediction timestamp"
}
```
