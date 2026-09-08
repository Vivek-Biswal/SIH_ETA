# ETA Baseline Assumptions

This document formally records every assumption made by each implemented ETA baseline, along with the specific limitations those assumptions create.

---

## SCHEDULE_BASELINE

### Assumptions
1. **Timetable Validity**: The reconstructed timetable (`journeys_scheduled.json`) accurately represents the planned route and timing.
2. **No Real-Time State**: No current delay, position, or speed data is considered.
3. **Static Conditions**: The baseline assumes the train will arrive exactly as scheduled.
4. **Day Ordering**: Multi-day journeys are ordered by the `day` field; Day 1 = first operating calendar day.

### Limitations
- **Does not account for current delays** — if a train is running 2 hours late, this baseline still outputs the original scheduled time.
- **Scheduled ≠ Actual** — the schedule is a plan, not an observation. It cannot serve as ground truth for evaluating any ETA system.
- **Cannot update dynamically** — it produces the same result regardless of real-world conditions.

---

## DELAY_ADJUSTED_BASELINE

### Assumptions
1. **Constant Delay Propagation**: The current delay (in minutes) is assumed to remain constant from the current point to the destination. The train neither recovers time nor accumulates additional delay.
2. **Live Delay Source**: The `current_delay_minutes` input MUST come from a real-time or snapshot live observation (e.g. Railpull, RailRadar API). It must NOT be sourced from DA323 historical averages, which reflect past aggregate statistics, not the current train's state.
3. **Scheduled Baseline as Foundation**: This baseline uses the SCHEDULE_BASELINE output as its starting point and applies the delay on top.
4. **Day Overflow**: If the delay pushes the arrival past midnight (00:00), the predicted day is incremented accordingly.

### Limitations
- **Delay recovery is not modelled** — Indian trains frequently make up significant delays at major stops (e.g. Rajdhani priority). This baseline cannot capture that.
- **Delay accumulation is not modelled** — additional delays at intermediate stops are ignored.
- **Snapshot limitation** — if the live delay data is a single point snapshot (as in the current Railpull dataset), it may not reflect the train's state at prediction time.
- **DA323 misuse risk** — using historical average delay from DA323 as the `current_delay_minutes` would be scientifically incorrect and is explicitly forbidden.

---

## General Assumptions (All Baselines)

- **Station codes are consistent**: Station codes in the schedule match those in the station dictionary.
- **IST Timezone**: All times are in Indian Standard Time (UTC+5:30). No timezone conversion is performed.
- **No Cancellation Handling**: Cancelled trains are not currently detected by the baseline; queries against a cancelled train would return schedule data without a cancellation flag.
- **Single Destination**: Each call predicts ETA for one destination. Multi-stop ETA sequences are not currently implemented.
