# ETA Capability Matrix

This document clearly defines what the current data and system architecture can and cannot support for ETA estimation.

---

## Currently Available Inputs

| Input | Available | Source | Notes |
|---|---|---|---|
| Static train schedules | ✓ Yes | `schedules_clean.json` | 416,636 stop records |
| Reconstructed journey sequences | ✓ Yes | `journeys_scheduled.json` | 5,208 journeys |
| Station information | ✓ Yes | `stations_clean.json` | 8,990 stations |
| Route structure (stop ordering) | ✓ Yes | `journeys_scheduled.json` | Inferred ordering |
| Train metadata | ✓ Yes | `trains_clean.json` | Type, distance, duration |
| Historical aggregated station statistics | ✓ Partial | DA323 (`public_historical_delay_clean.csv`) | Averages only, not individual records |
| Live delay snapshots | ✓ Partial | `delays_clean.json` | 444 trains, single snapshot |

---

## Currently Unavailable Inputs

| Input | Available | Why Not Available |
|---|---|---|
| Historical individual movement trajectories | ✗ No | No database of past train position logs exists in scope |
| Historical actual arrival timestamps | ✗ No | DA323 is purely aggregated, not individual observations |
| Time-aligned train locations (GPS/route position) | ✗ No | Not collected; RailRadar integration exists but not stored historically |
| Historical live speed data | ✗ No | Not in any dataset |
| Completed journey ground truth records | ✗ No | Would require real-time ingestion over extended period |

---

## What the Current System CAN Do

| Capability | Method | Confidence |
|---|---|---|
| Return scheduled arrival from timetable | Schedule Baseline | High (data is static) |
| Estimate arrival given current snapshot delay | Delay-Adjusted Baseline | Low (assumes delay constant) |
| Validate that a destination exists on a route | Route Validation | High |
| Compute scheduled journey duration | Schedule arithmetic | High |

---

## What the Current System CANNOT Do

| Capability | Reason |
|---|---|
| Predict actual arrival accurately | No ground-truth to train or validate against |
| Model delay recovery along a route | No segment-level delay time series |
| Dynamically update ETA as train moves | No live position feed ingested over time |
| Evaluate prediction accuracy (MAE/RMSE) | No actual arrival records to compare against |
| Classify delay as systemic or incidental | Insufficient granularity in DA323 |

---

## Scientific Summary

The current system implements **deterministic schedule-based ETA baselines**. These are honest, reproducible, and scientifically sound given the available data. They are not machine learning models. They do not claim real-world accuracy.

The correct progression is:

1. **Now (Chunk 3):** Deterministic baselines using static schedules
2. **Future Phase 1:** Accumulate live delay observations over time
3. **Future Phase 2:** Feature engineering + supervised ML using verified ground truth
