# Current Project Data Status

> [!WARNING]
> **CORRECTION NOTICE:** For the final, audited assessment of dataset suitability (especially regarding DA323 and supervised ML), please refer to [`final_data_verification.md`](file:///c:/Users/Lenovo/OneDrive/Desktop/GitHub/SIH_ETA/railway_eta_data/docs/final_data_verification.md).

This document answers core questions about the state of our data and summarizes our readiness for ETA modeling.

## Questions

1. **What data do we currently have?**
   - Datameet (static stations, trains, schedules)
   - Railpull (snapshot of delays)
   - DA323 (historical aggregated delay statistics)
   - RailRadar (live telemetry API)
2. **What data is real?**
   All of our data is real. We have intentionally avoided creating any synthetic data.
3. **What data is static?**
   The Datameet stations, trains, and schedules are static. They represent the legacy baseline timetables and topology.
4. **What data is historical?**
   The DA323 dataset is historical, but strictly *aggregated* (e.g. average delay at a station over 2023-2024). We do *not* have historical individual journey logs.
5. **What data is live?**
   The RailRadar API integration provides live, real-time telemetry snapshots (location and delay).
6. **What data is missing?**
   We are missing historical logs of *actual arrival times* for individual journeys.
7. **What can currently be used for EDA?**
   We can perform Exploratory Data Analysis on historical average delays, route topologies, scheduling distributions, and station bottlenecks.
8. **What can currently be used for feature engineering?**
   We can engineer baseline scheduled features (distance, planned duration) and historical prior features (average historical delay per station).
9. **What can currently be used for machine learning?**
   Without actual arrival data (the ground truth target variable), we cannot train a supervised regression model for ETA. 
10. **What cannot yet be done because historical actual arrival data is missing?**
    We cannot calculate true remaining journey times for past observations, which means we cannot train or validate a scientifically sound machine-learning predictive model.

## Final Classification

| DATASET | REAL OR SYNTHETIC | STATIC OR HISTORICAL OR LIVE | FREE | PUBLIC | PERMISSION REQUIRED | USE IN PROJECT |
|---|---|---|---|---|---|---|
| Datameet Stations | REAL | STATIC | YES | YES | NO | Baseline Network Topology |
| Datameet Trains | REAL | STATIC | YES | YES | NO | Train Typology |
| Datameet Schedules| REAL | STATIC | YES | YES | NO | Scheduled Timetables & Distances |
| Railpull Delays | REAL | LIVE_SNAPSHOT | YES | YES | NO | Current Delay Point-in-time |
| RailRadar API | REAL | LIVE_SNAPSHOT | YES | YES | YES | Real-time observation trigger |
| DA323 Delay | REAL | HISTORICAL_AGGREGATED | YES | YES | NO | Prior probability bias/historical stats |

## Final Verdict

**A. READY FOR EDA**
**B. READY FOR FEATURE ENGINEERING**
**D. NOT YET READY FOR SCIENTIFICALLY VALID REAL-WORLD ETA MODEL**

We have successfully built a robust pipeline and architecture for legitimate, public free data. We can analyze the network, derive scheduled features, and check historical biases. However, the absolute lack of historical ground-truth target variables (actual arrival logs) fundamentally prevents the training of a scientifically valid predictive model at this stage.
