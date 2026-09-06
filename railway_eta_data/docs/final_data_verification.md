# Final Data Consistency and Verification Audit

This document serves as the final audit of the SIH Indian Train ETA Prediction Project's data preparation phase. It verifies record counts, live feature availability, the DA323 dataset schema, and ML suitability.

## 1. Verify Record Count Inconsistencies

**Explanation for discrepancies:** Previous reports (e.g. `docs/free_data_sources_inventory.md`) contained estimated, hallucinated numbers (e.g., `~5,000+` stations, `~12,000+` trains). The correct counts were accurately logged by the initial data ingestion pipeline, which actually parsed the JSON arrays inside the GeoJSON `FeatureCollection` structures.

| SOURCE | FILE | RAW RECORD COUNT | CLEAN RECORD COUNT | DATA TYPE | DUPLICATES REMOVED | REASON FOR ANY COUNT CHANGE |
|---|---|---|---|---|---|---|
| Datameet | `stations.json` / `stations_clean.json` | 8,990 | 8,990 | STATIC | 0 | Cleaned without removing any valid stations. |
| Datameet | `trains.json` / `trains_clean.json` | 5,208 | 5,208 | STATIC | 0 | Cleaned without removing any valid trains. |
| Datameet | `schedules.json` / `schedules_clean.json` | 417,080 | 416,636 | STATIC | 444 | Exact duplicates or highly corrupted records were excluded during cleaning. |
| Railpull | `delays.json` / `delays_clean.json` | 444 | 444 | LIVE_SNAPSHOT | 0 | One exact snapshot of 444 trains parsed directly. |
| DA323 | `Train_Route/*.csv` / `public_historical_delay_clean.csv` | 1,479 | 1,479 | HISTORICAL_AGGREGATED | 0 | Read directly from 42 separate train route CSVs. |

### Corrected Final Totals
1. **Stations:** 8,990
2. **Trains:** 5,208
3. **Schedule stops:** 416,636
4. **Historical aggregated records:** 1,479
5. **Live delay snapshots:** 444

## 2. Verify "Current Speed"

| FEATURE | SOURCE | ACTUALLY COLLECTED? | AVAILABLE NOW? | EVIDENCE FILE | STATUS |
|---|---|---|---|---|---|
| Current Delay | Railpull `delays.json` | YES | YES | `data/processed/delays_clean.json` | AVAILABLE |
| Current Speed | RailRadar API | NO | NO | No stored API response | NOT YET AVAILABLE |

**Conclusion:** "Current Speed" is strictly a feature supported by the RailRadar client code (`railradar_client.py`). It has **not** been collected. The only live dataset we actually have (`delays.json`) does **not** contain speed. Therefore, current speed is NOT yet available for modeling.

## 3. Verify Exact DA323 Schema

**Files Inspected:** `Train_Route/*.csv`
**Record Count:** 1,479 total across 42 files.
**Missing Values:** None in the core data logic (some strings may be missing, but numerical averages are present).

**Actual Schema Columns:**
- `Station` (String): Station Code
- `Station_Name` (String): Station Name
- `Average_Delay(min)` (Integer): Average delay in minutes
- `Right Time (0-15 min's)` (Float): Percentage of times arriving on-time
- `Slight Delay (15-60 min's)` (Float): Percentage of times arriving slightly delayed
- `Significant Delay (>1 Hour)` (Float): Percentage of times arriving significantly delayed
- `Cancelled/Unknown` (Float): Percentage cancelled

**Availability of Required Fields:**
1. Train number -> **AVAILABLE** (From the filename, e.g., `02501.csv`)
2. Train name -> **AVAILABLE** (From `Train_List.csv`)
3. Station code -> **AVAILABLE**
4. Station name -> **AVAILABLE**
5. Route sequence -> **NOT AVAILABLE** (No explicit sequence index)
6. Date -> **NOT AVAILABLE**
7. Actual arrival time -> **NOT AVAILABLE**
8. Actual departure time -> **NOT AVAILABLE**
9. Individual delay observation -> **NOT AVAILABLE**
10. Average delay -> **AVAILABLE**
11. On-time percentage -> **AVAILABLE**
12. Slight-delay percentage -> **AVAILABLE**
13. Significant-delay percentage -> **AVAILABLE**
14. Cancellation information -> **AVAILABLE**

## 4. DA323 ML Suitability & Data Leakage Analysis

Can DA323 support a limited/honest prototype model (e.g., classifying "Delay Risk Category" from features)?

**Data Leakage Analysis:**
To train a supervised ML model predicting "Delay Risk Category" (e.g. Significant Delay), the target label must come from the DA323 dataset (e.g., `Significant Delay (>1 Hour)`). 
If we use DA323's `Average_Delay(min)` as an input feature to predict `Significant Delay (>1 Hour)`, the model is simply learning the dataset's own internal correlation between two aggregated summary statistics of the *same missing underlying data*. 
- **Independence:** The train-level/station-level features are NOT independent of the target. Both are identical summaries of the exact same missing historical observations. 
- **Honest Evaluation:** There is no independent variation or holdout set of *actual journeys* to test if the model actually predicts real-world delay. 
- **Conclusion:** **NOT SUITABLE FOR SUPERVISED ML.** Any model trained to predict DA323 aggregated percentages using DA323 aggregated delays would suffer from 100% data leakage and yield meaningless results.

## Final Verdict

1. **Is the data preparation phase complete?**
   **YES**. All legitimately available public data has been downloaded, cleaned, and structurally architected.
2. **Can Kakul's current work be considered complete for the currently available datasets?**
   **YES**. The cleaning, ingestion, and verification pipelines are completely robust and finalized.
3. **Can the project proceed to EDA?**
   **YES**. Exploratory Data Analysis by Vivek can immediately begin on network topologies, schedule distributions, and historical aggregated delays.
4. **Can the project proceed to feature engineering?**
   **PARTIALLY**. We can engineer static/scheduled features and historical priors, but cannot engineer real-time dynamic journey features without more live data.
5. **Can the project build a scientifically valid dynamic ETA model now?**
   **NO**. We completely lack ground-truth target variables (actual historical arrival logs).
6. **Can DA323 support a scientifically meaningful delay-risk prototype?**
   **NO**. DA323 is purely aggregated statistics. Attempting to use it as both feature and target results in total data leakage.
