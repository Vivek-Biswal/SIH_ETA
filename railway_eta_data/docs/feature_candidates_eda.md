# Feature Candidates EDA

This document details the features that have been scientifically validated as potentially extractable from the available datasets during the Exploratory Data Analysis (Group A - Chunk 2). 

> [!WARNING]
> **Scientific Constraint**: The SIH Indian Train ETA Project does **not** currently possess properly time-aligned historical records of individual train movements with actual future arrivals. Therefore, these features represent structural context for baseline modeling or exploratory analysis, but cannot be safely used to train a dynamic supervised ETA model at this stage.

## A. STATIC FEATURES
These features are fixed parameters related to trains or geography.
- **Train Type**: (e.g., Shatabdi, Rajdhani, Express). Sourced from `trains_clean.json`.
- **Scheduled Duration**: Overall scheduled journey time in hours. Sourced from `trains_clean.json` (duration_h/m).
- **Route Distance**: Overall route distance in km. Sourced from `trains_clean.json`.
- **Stop Count**: Number of stations the train stops at. Sourced from `journeys_scheduled.json` / `schedules_clean.json`.
- **Railway Zone**: The administrative zone of a station. Sourced from `stations_clean.json`.
- **State**: Geographic state of the station. Sourced from `stations_clean.json`.

## B. TIME FEATURES
These features define the time context of the journey, derived from static schedules.
- **Scheduled Departure Hour**: The 0-23 hour bin for departure. Sourced from `schedules_clean.json`.
- **Scheduled Arrival Hour**: The 0-23 hour bin for arrival. Sourced from `schedules_clean.json`.
- **Journey Day**: Multi-day route progression marker. Sourced from `schedules_clean.json` (`day` column).

## C. ROUTE FEATURES
These structural variables describe a train's sequence.
- **Average Distance Between Stops**: Computed as Route Distance / Stop Count.
- **Route Topology Sequence**: The exact ordering of stations. Sourced from `journeys_scheduled.json`.

## D. HISTORICAL CONTEXT FEATURES
Aggregated, high-level metrics representing historical performance.
- **Historical Average Delay (DA323)**: Average recorded delay at a specific station. 
- **Historical Delay Probability**: Percent right-time vs significant delay.

> [!CAUTION]
> **DATA LEAKAGE RISK**: These metrics are pre-aggregated statistics. Using them as both a feature to predict delay and evaluating the model against them will cause 100% data leakage. They represent context, not individual observations.

## E. LIVE FEATURES
Live variables that would be used dynamically.
- **Current Snapshot Delay**: The delay in minutes at a given snapshot time. Sourced from `delays_clean.json` or live RailRadar API.

> [!NOTE]
> Variables like *Current Speed*, *GPS Position*, or *Segment Progress* are **NOT** available in the current dataset and cannot be used as candidates.
