# ETA Formal Definition

This document formally defines all key temporal terms used in the SIH Indian Train ETA project. Precise definitions are essential to prevent scientific confusion between different classes of arrival information.

---

## A. Scheduled Arrival Time

**Definition:**
The planned arrival time at a station as specified in the official railway timetable.

- Sourced from: `schedules_clean.json` (`arrival` field)
- Nature: **Static** — fixed in advance; does not change based on real-world conditions
- Example: "The Rajdhani Express is scheduled to arrive at Nagpur at 14:25 on Day 1"
- Notation: `t_sched`

---

## B. Estimated Arrival Time (ETA)

**Definition:**
A system-generated estimate of when a train will arrive at a station, computed at a specific moment in time (the *prediction timestamp*). It may be based on static schedules, current delay information, or (in a future ML system) a trained predictive model.

- Nature: **Dynamic** — changes as new information becomes available
- It is an *estimate*, not a guarantee
- Example: "Based on a current delay of 20 minutes, the estimated arrival is now 14:45"
- Notation: `t_eta`

---

## C. Actual Arrival Time

**Definition:**
The verified, real-world timestamp at which a specific train physically arrived at a specific station during a specific journey instance.

- Nature: **Observed ground truth**
- This is the value required to evaluate ETA prediction accuracy
- **CRITICAL PROJECT NOTE**: The current dataset does NOT contain verified actual arrival timestamps for individual journeys. The DA323 dataset contains aggregated historical averages, not individual actual arrivals. This distinction is non-negotiable.
- Notation: `t_actual`

---

## D. Prediction Timestamp

**Definition:**
The exact moment in time at which an ETA prediction is generated and issued.

- This is when the system "runs" a prediction
- Example: "The ETA was computed at 13:00, while the train was at Station A"
- Notation: `t_predict`
- **Current System**: Because no live observation stream exists, this concept is only partially implemented. Predictions are generated on demand, not continuously.

---

## E. Remaining Travel Time (RTT)

**Definition:**
The duration between the prediction timestamp and the predicted arrival time.

```
RTT = t_eta - t_predict
```

- A positive RTT means the train has not yet arrived
- A zero or negative RTT means the train should have arrived by now
- **Current System**: Without live position tracking, RTT cannot be computed dynamically. Only static RTT (based on the scheduled timetable) is currently computable.

---

## Key Distinctions

| Concept | Source | Nature | Available Now? |
|---|---|---|---|
| Scheduled Arrival (`t_sched`) | Static timetable | Fixed | ✓ Yes |
| Estimated Arrival (`t_eta`) | Baseline computation | Dynamic estimate | ✓ Partially (schedule-based) |
| Actual Arrival (`t_actual`) | Real-world observation | Verified ground truth | ✗ No |
| Prediction Timestamp (`t_predict`) | System clock at query time | Dynamic | ✓ Yes (on demand) |
| Remaining Travel Time (RTT) | `t_eta - t_predict` | Derived | ✓ Partially (static) |

---

## Why the Distinction Matters

Using **Scheduled Arrival** as a proxy for **Actual Arrival** to evaluate prediction accuracy is a **scientific error**. The schedule is what we are trying to improve upon — it cannot simultaneously be both the prediction and the ground truth.

The correct evaluation loop is:

```
[Prediction Timestamp] --> [ETA Prediction] --> [Actual Arrival (observed later)] --> [Error = Actual - Predicted]
```

This loop requires real-time or historical observation of actual arrivals, which the current dataset does not provide.
