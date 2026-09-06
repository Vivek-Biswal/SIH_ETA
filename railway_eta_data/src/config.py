import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Data Directories
RAW_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "processed")

# Specific Data Sources
DATAMEET_DIR = os.path.join(RAW_DATA_DIR, "railways")
RAILPULL_DIR = os.path.join(RAW_DATA_DIR, "railpull", "data", "out")
DA323_DIR = os.path.join(RAW_DATA_DIR, "public_historical_delay")

# Other Project Directories
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports")
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")

# Global Output Files
DECISION_LOG_PATH = os.path.join(PROCESSED_DATA_DIR, "decision_log.csv")
