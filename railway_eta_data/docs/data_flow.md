# Data Flow Architecture

The data architecture of the SIH Indian Train ETA Prediction Project ensures that raw data is never mutated, all cleaning logic is reproducible and logged, and the final analytical datasets are consistent.

```mermaid
flowchart TD
    %% Raw Data Sources
    subgraph Raw Data Layer
        D[Datameet GitHub (Static)] --> R1(stations.json)
        D --> R2(trains.json)
        D --> R3(schedules.json)
        
        R[Railpull API (Live Snapshot)] --> R4(delays.json)
        
        DA[DA323 Dataset (Historical)] --> R5(Train_Route/*.csv)
    end

    %% Pipeline Processing
    subgraph Data Processing Pipeline
        P1[run_cleaning.py Orchestrator]
        
        R1 --> P1
        R2 --> P1
        R3 --> P1
        R4 --> P1
        R5 --> P1
        
        P1 --> |Validation & Filtering| C[Cleaners]
    end

    %% Processed Data Layer
    subgraph Processed Data Layer
        C --> P_S1(stations_clean.json)
        C --> P_S2(trains_clean.json)
        C --> P_S3(schedules_clean.json)
        C --> P_S4(delays_clean.json)
        C --> P_S5(public_historical_delay_clean.csv)
        
        C --> LOG(decision_log.csv)
    end
    
    %% Analytics
    subgraph Downstream Analytics
        P_S1 --> EDA[Exploratory Data Analysis]
        P_S2 --> EDA
        P_S3 --> EDA
        P_S4 --> EDA
        P_S5 --> EDA
    end
```

## Explanation of Layers

1. **Raw Data Layer:** The exact files scraped or downloaded from upstream sources. Located in `data/raw/`. These are strictly read-only.
2. **Data Processing Pipeline:** Python scripts inside `src/cleaning/` that validate schema, types, and logic (e.g., negative distances). The pipeline orchestrator is `src/run_cleaning.py`.
3. **Processed Data Layer:** The output layer located in `data/processed/`. These are the standard clean datasets to be consumed by downstream analysis.
4. **Decision Log:** A universal audit log tracking every data point dropped, modified, or flagged for investigation.
