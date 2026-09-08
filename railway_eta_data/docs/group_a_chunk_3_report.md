# Group A - Chunk 3 Report: ETA Baseline System Design

This document serves as the final report for Group A Chunk 3 of the SIH Indian Train ETA Project.

---

## 1. Work Completed

- Formally defined ETA terminology (Scheduled vs Estimated vs Actual arrival)
- Mapped the current ETA capability and its limits honestly
- Implemented two deterministic ETA baselines operating entirely on available data
- Built a unified predictor interface with automatic baseline selection
- Implemented complete input/output validation with clear error messages
- Handled overnight and multi-day journey time arithmetic correctly
- Wrote 30 targeted tests covering all edge cases
- Documented all assumptions, limitations, and future requirements
- Demonstrated the system against 5,208 real reconstructed journeys

---

## 2. Files Created

**Source Code (`src/eta/`):**
- `__init__.py` — Module package
- `contract.py` — `ETARequest` and `ETAPrediction` dataclasses
- `validators.py` — Input validation with `ETAValidationError`
- `schedule_baseline.py` — `SCHEDULE_BASELINE` implementation + time arithmetic helpers
- `delay_baseline.py` — `DELAY_ADJUSTED_BASELINE` implementation
- `predictor.py` — Unified `predict_eta()` interface + `build_journeys_lookup()`

**Runners:**
- `src/run_eta_baseline.py` — Demonstration runner against real data

**Tests:**
- `tests/test_eta_baselines.py` — 30 tests covering all baselines, validators, edge cases

**Reports:**
- `reports/eta_baseline_summary.csv` — Tabular baseline comparison

**Documentation:**
- `docs/eta_definition.md` — Formal definitions of all temporal concepts
- `docs/eta_capability_matrix.md` — What the system can/cannot do and why
- `docs/eta_input_contract.md` — Full field-by-field input/output schema
- `docs/eta_baseline_assumptions.md` — Per-baseline assumption and limitation list
- `docs/future_eta_evaluation_plan.md` — How MAE/RMSE should be computed when data allows
- `docs/eta_system_architecture.md` — Current and future architecture (with Mermaid diagrams)
- `docs/eta_examples.md` — Six worked usage examples
- `docs/eta_baselines.md` — Master ETA documentation

---

## 3. Files Modified

- None. All existing datasets and pipelines are untouched.

---

## 4. ETA Baselines Implemented

| Baseline | When Used | Formula |
|---|---|---|
| `SCHEDULE_BASELINE` | No delay provided | `ETA = Scheduled Arrival` |
| `DELAY_ADJUSTED_BASELINE` | `current_delay_minutes` provided | `ETA = Scheduled Arrival + Delay` |

---

## 5. Input Requirements

**Currently Supported:**
- `train_number` (required)
- `destination_station` (required)
- `current_delay_minutes` (optional — enables delay-adjusted baseline)
- `current_station` (optional — enables position-aware validation)

**Future Required (not yet available):**
- Live position feed from RailRadar/NTES
- Historical actual arrival timestamps

---

## 6. Output Schema

Every prediction returns an `ETAPrediction` with:
`train_number`, `destination_station`, `scheduled_arrival`, `scheduled_day`, `predicted_arrival`, `predicted_day`, `current_delay_minutes`, `prediction_method`, `status`, `assumptions`, `message`

---

## 7. Assumptions

- **SCHEDULE_BASELINE**: Timetable is the planned route; no real-time conditions considered
- **DELAY_ADJUSTED_BASELINE**: Current delay persists unchanged; must come from live source, NOT DA323
- **Both**: IST timezone; station codes are consistent; cancellations not detected

---

## 8. Limitations

- No segment-level delay propagation
- No delay recovery modelling
- No cancellation handling
- Snapshot delay may be stale at prediction time
- DA323 cannot be used as the delay source

---

## 9. Test Results

**44/44 tests passed** across all test modules:
- `test_eta_baselines.py`: 30 tests — validators, time arithmetic, schedule baseline, delay-adjusted baseline, edge cases, assumptions checks
- `test_journey.py`: 7 tests — journey reconstruction
- `test_eda.py`: 2 tests — dataset overview, join analysis
- `test_validation.py`: 5 tests — data cleaning validators

---

## 10. Current ETA Capability

The system can:
- Return scheduled arrival for any of 5,208 trains to any stop on their route
- Adjust that estimate by a provided live delay value
- Handle overnight and multi-day journeys correctly
- Fail clearly and explicitly on invalid inputs
- Document every assumption it makes in every response

The system cannot:
- Predict actual arrival (no ground truth exists)
- Evaluate its own accuracy with MAE/RMSE
- Dynamically update as the train moves (no live position stream)

---

## 11. What Additional Data Is Required for Real ML

1. **Historical actual arrivals**: Individual records linking each train journey to verified departure/arrival times at each station (minimum ~30 journeys × 500+ trains)
2. **Time-aligned delay observations**: Time series of delay snapshots across a journey, not just one snapshot
3. **Route-position context**: Which segment the train is currently in at observation time
4. **Sustained collection period**: Minimum 3 months to capture seasonal variation

---

## 12. Ready for Chunk 4

The following foundation is now in place for Chunk 4:
- Clean processed data (Chunk 1)
- Comprehensive EDA with feature candidates (Chunk 2)
- Working ETA baseline engine with full validation and documentation (Chunk 3)
- 44 passing tests covering the full pipeline
- Clear architectural roadmap from baselines → ML model
