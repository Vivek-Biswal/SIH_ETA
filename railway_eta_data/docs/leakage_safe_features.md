# Leakage-Safe Feature Rules

This document outlines the formal rules governing data leakage prevention in the SIH Indian Train ETA project.

## 1. Rule 1: No Future Information
No feature may contain information generated after the `prediction_timestamp`. If a model is predicting an arrival at 14:00 based on a state at 12:00, the features must exactly represent what was known at 12:00.

## 2. Rule 2: No Actual Arrivals as Features
Actual arrival information (if ever collected) represents the target variable. It cannot be used as an input feature for the same segment being predicted.

## 3. Rule 3: Future Delay Prohibition
Future delay information cannot be used. If a train is delayed by 20 minutes at Station A, and 40 minutes at Station B, a prediction made while the train is at Station A cannot use the 40-minute delay from Station B as an input.

## 4. Rule 4: Temporal Provenance of Aggregations
Aggregated historical statistics (like DA323 average delays) require explicit temporal provenance. Since we do not know the exact time window DA323 was calculated over, it is classified as `TEMPORALLY_UNSAFE` for strict time-series ML modeling. It may only be used as a static regional risk proxy.

## 5. Rule 5: Live Features Require Timestamps
Live features (such as `current_delay_minutes`) require a timestamp. Our current dataset `delays_clean.json` is a single snapshot. We assume the snapshot time is the prediction time for baseline testing purposes.

## 6. Rule 6: No Silent Replacements
Missing live data cannot be silently replaced with future data or fabricated data. If current delay is missing, it is missing.

## 7. Rule 7: Schedules are not Actuals
Schedule information (scheduled arrival, departure) is not actual movement information. They are planned static features, never dynamic live states.

## 8. Rule 8: Traceability
Feature source and transformation must be fully traceable. The `src/features/builder.py` explicitly logs the sources of all features combined in a feature record.
