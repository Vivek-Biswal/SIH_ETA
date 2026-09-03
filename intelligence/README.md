# Intelligence — SIH ETA

ML/AI modules for train ETA prediction and railway network intelligence.

## Structure

```
intelligence/
├── train_eta/
│   ├── data/            ← Data loading utilities (reads from data/raw, data/processed)
│   ├── preprocessing/   ← Cleaning, normalization, outlier handling
│   ├── features/        ← Feature engineering pipeline
│   ├── models/
│   │   ├── saved/       ← Serialized model artifacts (Git-ignored except registry)
│   │   └── checkpoints/ ← Training checkpoints (Git-ignored)
│   ├── training/        ← Model training scripts and config
│   ├── inference/       ← ETAPredictor class (interface for backend)
│   └── evaluation/      ← Evaluation metrics and comparison vs baseline
│
├── network_intelligence/
│   ├── graph/           ← Railway graph construction (NetworkX)
│   ├── route_analysis/  ← Route-level features and analysis
│   ├── congestion/      ← Congestion score computation
│   ├── conflict_detection/ ← Scheduling conflict detection
│   ├── inference/       ← NetworkIntelligenceService interface
│   └── models/saved/    ← Serialized network model artifacts
│
├── data_processing/     ← Shared data pipeline utilities
├── feature_engineering/ ← Shared feature utilities
└── tests/               ← Intelligence module tests
```

## Setup

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

## Data

- `data/raw/` — Put raw NTES historical dumps, timetable CSVs here. Git-ignored.
- `data/processed/` — Generated feature matrices. Git-ignored.
- `data/sample/` — Small sample datasets for development. Version controlled.

## Running the Pipeline

```bash
# Build features from sample data
python -m train_eta.features.build_features \
  --input ../data/sample/ \
  --output ../data/processed/

# Train model
python -m train_eta.training.train \
  --config train_eta/training/config.yaml

# Evaluate
python -m train_eta.evaluation.evaluate \
  --model-path train_eta/models/saved/<model_file>
```

## Inference Interface

The backend uses `train_eta/inference/predictor.py`:

```python
predictor = ETAPredictor(model_version="eta-xgboost-v1")
result = predictor.predict(
    train_number="12301",
    current_station_code="ALD",
    current_delay_minutes=18,
    date=datetime.date.today(),
)
```

**Do not change the `ETAPredictor.predict()` signature without coordinating with the backend team.**

## Tests

```bash
pytest tests/ -v
```
