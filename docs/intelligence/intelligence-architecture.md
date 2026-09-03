# Intelligence Architecture — SIH ETA

## 1. Overview

The intelligence layer is responsible for two core capabilities:

1. **Train ETA Prediction** — predicting arrival times at all remaining stations for a running train
2. **Network Intelligence** — understanding the railway network topology, congestion, and its effect on delays

These two modules are independent but feed into each other: network congestion scores are used as features by the ETA model.

---

## 2. Train ETA Module (`intelligence/train_eta/`)

### 2.1 Pipeline Overview

```
Raw Data (NTES + historical CSVs)
   ↓  intelligence/train_eta/data/
Preprocessing
   ↓  intelligence/train_eta/preprocessing/
Feature Engineering
   ↓  intelligence/train_eta/features/
Model Training
   ↓  intelligence/train_eta/training/
Evaluation
   ↓  intelligence/train_eta/evaluation/
Saved Model
   ↓  intelligence/train_eta/models/saved/
Inference
   ↓  intelligence/train_eta/inference/
Backend ETAService (via Python import or REST call)
```

### 2.2 Feature Categories

| Category | Features |
|---|---|
| **Temporal** | Hour of day, day of week, month, season, holiday indicator |
| **Historical delay** | Avg delay (train, station, day_of_week), 7-day rolling avg, trend |
| **Route** | Distance from origin, number of stops remaining, halt duration |
| **Network** | Congestion score on current segment, adjacent train conflicts |
| **Weather** | Weather condition (clear/rain/fog), visibility |
| **Train type** | Rajdhani vs Mail vs Passenger (different delay distributions) |

### 2.3 Model Strategy

**Baseline:** Naive schedule offset (what NTES currently does)
**Target:** Beat baseline by meaningful margin on held-out evaluation set

**Approach:**
1. **XGBoost** (gradient boosting on tabular features) — fast, interpretable, strong on tabular data
2. **LightGBM** — if XGBoost underperforms on large datasets
3. **Sequence model (LSTM/Transformer)** — for capturing temporal delay propagation across a route (optional Phase 2)

### 2.4 Evaluation Metrics

| Metric | Description | Target |
|---|---|---|
| MAE | Mean Absolute Error (minutes) | < 8 min (vs naive ~22 min) |
| RMSE | Root Mean Squared Error | Minimize |
| % within 5 min | Fraction of predictions within 5 min | > 65% |
| % within 15 min | Fraction of predictions within 15 min | > 90% |

---

## 3. Network Intelligence Module (`intelligence/network_intelligence/`)

### 3.1 Railway Graph

The railway network is modeled as a **weighted directed graph**:
- **Nodes:** Stations
- **Edges:** Route segments between consecutive stations
- **Edge weights:** Base travel time, congestion score, historical delay factor

```
Graph representation: NetworkX or custom adjacency structure
```

### 3.2 Congestion Detection

Congestion on a route segment is computed from:
- Number of trains currently on the segment
- Their aggregate delay
- Platform availability at the next junction

Congestion score is a normalized 0-1 value updated every N minutes.

### 3.3 Conflict Detection

A conflict is detected when two trains are scheduled on the same track segment with insufficient buffer, making delay propagation likely. Conflict scores are used as features in the ETA model.

---

## 4. Inference Interface

The backend accesses ETA predictions through a clean Python interface:

```python
# intelligence/train_eta/inference/predictor.py

class ETAPredictor:
    def predict(
        self,
        train_number: str,
        current_station_code: str,
        current_delay_minutes: int,
        date: datetime.date,
        weather_condition: str | None = None,
        congestion_scores: dict[str, float] | None = None,
    ) -> ETAPrediction:
        ...
```

This interface contract is stable — the ML team can change the model internals freely as long as the interface signature stays the same.

---

## 5. Data Requirements

### Training Data Sources

| Source | Data | Format |
|---|---|---|
| NTES API | Live running status | REST JSON |
| Historical IRCTC/NTES dumps | 3-5 years of delay records | CSV |
| India Meteorological Dept | Weather at station locations | API |
| Indian Railways timetable | Scheduled times | CSV / PDF |

Training data goes into `data/raw/` (Git-ignored, managed via DVC or manual download).
Processed features go into `data/processed/` (Git-ignored).
Sample data for dev/testing goes in `data/sample/` (version controlled, small).

---

## 6. Model Registry

Trained models are saved to `intelligence/train_eta/models/saved/`.

**Naming convention:** `eta_xgboost_v{major}_{minor}_{YYYYMMDD}.pkl`

Model versions are tracked in `intelligence/train_eta/models/MODEL_REGISTRY.md`.

The active model version used by inference is configured via the `MODEL_VERSION` environment variable.
