# ETA Baseline Examples

All examples below use the standard `predict_eta()` interface. They demonstrate realistic usage patterns and edge cases.
No actual arrivals are fabricated. No accuracy claims are made.

---

## Example 1 — Schedule-Only ETA

**Scenario**: A user wants to know when Train 12001 is scheduled to arrive at station `NDLS`.

```python
from src.eta.predictor import predict_eta, build_journeys_lookup
import json

journeys = json.load(open("data/processed/journeys_scheduled.json"))
lookup = build_journeys_lookup(journeys)

pred = predict_eta(
    train_number="12001",
    destination_station="NDLS",
    journeys_lookup=lookup,
)

# Output:
# train_number     : 12001
# destination      : NDLS
# prediction_method: SCHEDULE_BASELINE
# scheduled_arrival: 08:30:00  (Day 1.0)
# predicted_arrival: 08:30:00  (Day 1.0)
# status           : OK
# assumptions      : ["The reconstructed timetable is assumed to be the planned route.", ...]
```

**Key Point**: The `predicted_arrival` equals `scheduled_arrival` here. This is correct — the Schedule Baseline IS the timetable. No claim of real accuracy is made.

---

## Example 2 — Delay-Adjusted ETA

**Scenario**: Train 12001 is currently 45 minutes late (from a live delay snapshot). The user wants an adjusted ETA.

```python
pred = predict_eta(
    train_number="12001",
    destination_station="NDLS",
    journeys_lookup=lookup,
    current_delay_minutes=45,
    current_station="BPL",
)

# Output:
# prediction_method: DELAY_ADJUSTED_BASELINE
# scheduled_arrival: 08:30:00  (Day 1.0)
# predicted_arrival: 09:15:00  (Day 1.0)
# delay_applied    : 45 min
# assumption       : "Current delay persists unchanged to destination."
```

**Key Point**: The delay value MUST come from a live source (RailRadar, Railpull). Using DA323 average delays here would be scientifically wrong.

---

## Example 3 — Invalid Destination

**Scenario**: The user provides a station code that does not appear on Train 12001's route.

```python
pred = predict_eta(
    train_number="12001",
    destination_station="CSTM",  # Not on this train's route
    journeys_lookup=lookup,
)

# Output:
# status : INVALID_DESTINATION
# message: "Destination 'CSTM' not found in this train's route."
```

**Key Point**: The system fails clearly. No guessed ETA is produced.

---

## Example 4 — Missing Current Delay (graceful fallback)

**Scenario**: The system tries delay-adjusted, but no delay is available at query time.

```python
pred = predict_eta(
    train_number="12001",
    destination_station="NDLS",
    journeys_lookup=lookup,
    current_delay_minutes=None,   # Not available
)

# Output:
# prediction_method: SCHEDULE_BASELINE (delay not provided)
# predicted_arrival: 08:30:00
# status           : OK
# assumptions      : [..., "No current delay was provided; schedule baseline was used instead."]
```

**Key Point**: The fallback is transparent — the method name explicitly states no delay was used.

---

## Example 5 — Overnight / Multi-Day Journey

**Scenario**: Train 15007 departs Day 1 and the destination is on Day 2. A 90-minute delay is applied.

```python
pred = predict_eta(
    train_number="15007",
    destination_station="GKP",    # Arrives Day 2 at 02:30
    journeys_lookup=lookup,
    current_delay_minutes=90,
)

# Output:
# scheduled_arrival: 02:30:00  (Day 2.0)
# predicted_arrival: 04:00:00  (Day 2.0)
# predicted_day    : 2.0
# prediction_method: DELAY_ADJUSTED_BASELINE
```

**Key Point**: Day overflow is correctly handled. A scheduled Day 2 arrival with a 90-minute delay remains Day 2 (04:00 is within Day 2 bounds).

---

## Example 6 — Destination Before Current Station

**Scenario**: A user accidentally queries a destination that the train has already passed.

```python
pred = predict_eta(
    train_number="12001",
    destination_station="BPL",   # Station 5 in route
    journeys_lookup=lookup,
    current_station="NDLS",      # Station 8 — already past BPL
)

# Output:
# status : ERROR
# message: "Destination 'BPL' (seq=5) does not come after current station 'NDLS' (seq=8)."
```

**Key Point**: The system correctly refuses to produce a backward ETA.
