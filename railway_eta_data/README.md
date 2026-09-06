# railway_eta_data

Project for predicting Indian Train ETAs.

## Data Ingestion Pipeline

The project includes an automated data ingestion pipeline that detects file formats (CSV, JSON, JSONL), extracts metadata/schemas, and records source information without modifying the raw datasets.

### How to Run

1. Activate your virtual environment and ensure dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the ingestion script from the project root:
   ```bash
   python src/run_ingestion.py
   ```

3. The pipeline will process all data files in `data/raw/` and generate a summary report at `reports/dataset_summary.csv`.

