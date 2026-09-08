# Final System Data Flow

This document visualizes the data flow for the Group A ETA prediction system.

```mermaid
graph TD
    subgraph Data Sources
        SD(Static Processed Datasets)
        LD(Live Delay Snapshot/Input)
        HD(Historical DA323 Data)
    end

    subgraph Core System Orchestrator
        TSB(TrainState Builder)
        DAL(Data Availability Layer)
        ETAO(ETA Orchestrator)
        BS(Baseline Selection)
    end
    
    subgraph Output
        ER(ETA Response)
    end
    
    subgraph Integration Layer
        BA(Backend API - Varun)
        FE(Frontend - Sneha)
    end
    
    subgraph Future Components
        ML(Future ML Model)
        LDB(Future Live Database)
    end

    SD --> TSB
    LD --> TSB
    HD -.->|Temporally Unsafe| TSB
    
    TSB --> DAL
    DAL --> ETAO
    ETAO --> BS
    
    BS -- "Valid Delay" --> DAB(Delay-Adjusted Baseline)
    BS -- "No Delay" --> SB(Schedule Baseline)
    
    DAB --> ER
    SB --> ER
    
    ER --> BA
    BA --> FE
    
    LDB -.->|Continuous Time-Series| ML
    ML -.->|Verified Predictions| BS
    
    classDef future stroke-dasharray: 5 5;
    class ML,LDB future;
    class HD future;
```

## Key Points:
1. **Historical DA323 Data** is parsed and available in the `TrainState` but is explicitly bypassed by the ETA Orchestrator during baseline calculation to prevent data leakage.
2. The **Baseline Selection** is strictly deterministic, choosing between schedule-only or current-delay-adjusted.
3. The system explicitly plans for **Future Components** (ML modeling and Live DB) which are currently missing.
