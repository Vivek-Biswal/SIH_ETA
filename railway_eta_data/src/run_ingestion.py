import os
import sys
from datetime import datetime

# Add src to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.ingestion.loader import load_dataset, detect_format
from src.ingestion.metadata import DatasetMetadata, save_metadata_summary

def determine_source_info(path: str):
    """Heuristic to determine source based on path."""
    if 'datameet' in path.lower() or 'railways' in path.lower():
        if 'railpull' not in path.lower():
            return "Datameet Indian Railways", "https://github.com/datameet/railways"
    if 'railpull' in path.lower():
        return "Railpull", "https://github.com/shwetankg07/railpull"
    
    return "Unknown", "Unknown"

def run_pipeline(raw_data_dir: str, output_report: str):
    metadata_list = []
    
    print(f"Starting ingestion pipeline on {raw_data_dir}...")
    
    for root, dirs, files in os.walk(raw_data_dir):
        # Skip virtual environments, git dirs, etc.
        if '.venv' in root or '.git' in root or 'node_modules' in root:
            continue
            
        for file in files:
            file_path = os.path.join(root, file)
            fmt = detect_format(file_path)
            
            # Only process recognized formats
            if fmt not in ['csv', 'json', 'jsonl']:
                continue
                
            # Skip package.json and similar metadata files from repos
            if 'package' in file or 'crawl-status' in file:
                continue
                
            print(f"Processing: {file_path}")
            
            # 1. Automatic detection & Loading
            data, record_count, schema = load_dataset(file_path)
            
            if data is not None:
                # 2. Record Source
                source_name, source_url = determine_source_info(file_path)
                
                # 3. Create Metadata record
                meta = DatasetMetadata(
                    source_name=source_name,
                    source_url=source_url,
                    file_name=file,
                    file_format=fmt,
                    ingestion_date=datetime.now().isoformat(),
                    record_count=record_count
                )
                
                metadata_list.append(meta)
                print(f"  -> Successfully loaded {record_count} records. Schema columns: {len(schema)}")
            else:
                print(f"  -> Failed to load data.")
                
    # 4. Save summary
    save_metadata_summary(metadata_list, output_report)
    print(f"\nPipeline complete. Processed {len(metadata_list)} files.")
    print(f"Summary saved to {output_report}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(base_dir, 'data', 'raw')
    out_csv = os.path.join(base_dir, 'reports', 'dataset_summary.csv')
    
    run_pipeline(raw_dir, out_csv)
