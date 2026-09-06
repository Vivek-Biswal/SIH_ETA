# Data Join Analysis

This document evaluates the compatibility between the newly imported Historical Delay dataset (from DA323) and our primary static Datameet dataset.

## Join Compatibility Results

| DATASET A | JOIN FIELD | DATASET B | JOIN FIELD | MATCH RATE | PROBLEM | SOLUTION |
|---|---|---|---|---|---|---|
| Historical Delay | `train_number` | Datameet Trains | `number` | **42.86%** (18/42) | Many trains in the historical dataset are "Special" trains (e.g. `02501`) that are missing from the static Datameet `trains.json` database. | Treat the Datameet dataset as incomplete for special trains. We can use the historical dataset's `Train_List.csv` to supplement train names and types if needed, but we won't be able to get their static schedule from Datameet. |
| Historical Delay | `station_code` | Datameet Stations | `code` | **97.78%** (264/270) | A few station codes (e.g. `DDU`, `PRYJ`, `SMVB`) represent renamed stations (Mughalsarai, Allahabad, Baiyappanahalli) that use older codes in the Datameet static dataset. | Use a manual mapping dictionary in the `decision_log` for the ~6 missing stations (e.g., Map `DDU` -> `MGS`, `PRYJ` -> `ALD`). |

## Conclusion

The datasets **can be joined** successfully. The station match rate is exceptionally high. The train match rate reflects the reality of Indian Railways where Special/Holiday trains are temporary and not present in static legacy timetables. We will perform a Left Join (keeping all historical data) when generating features.
