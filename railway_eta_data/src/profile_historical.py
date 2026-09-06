import os
import pandas as pd
import glob
import csv

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data', 'raw', 'public_historical_delay', 'Dataset')
    report_file = os.path.join(base_dir, 'reports', 'public_historical_data_summary.csv')
    
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    
    summary = []
    
    # 1. Profile Train_List.csv
    train_list_path = os.path.join(data_dir, 'Train_List.csv')
    if os.path.exists(train_list_path):
        try:
            df = pd.read_csv(train_list_path)
            summary.append({
                'file_name': 'Train_List.csv',
                'format': 'csv',
                'record_count': len(df),
                'column_names': '|'.join(df.columns.tolist()),
                'data_types': '|'.join(df.dtypes.astype(str).tolist()),
                'missing_values': df.isnull().sum().sum(),
                'duplicate_records': df.duplicated().sum(),
                'sample_records': df.head(1).to_json(orient='records')
            })
        except Exception as e:
            print(f"Error profiling {train_list_path}: {e}")
            
    # 2. Profile Train_Route/*.csv
    route_dir = os.path.join(data_dir, 'Train_Route')
    route_files = glob.glob(os.path.join(route_dir, '*.csv'))
    
    for rf in route_files:
        try:
            df = pd.read_csv(rf)
            summary.append({
                'file_name': f'Train_Route/{os.path.basename(rf)}',
                'format': 'csv',
                'record_count': len(df),
                'column_names': '|'.join(df.columns.tolist()),
                'data_types': '|'.join(df.dtypes.astype(str).tolist()),
                'missing_values': df.isnull().sum().sum(),
                'duplicate_records': df.duplicated().sum(),
                'sample_records': df.head(1).to_json(orient='records')
            })
        except Exception as e:
            print(f"Error profiling {rf}: {e}")
            
    if summary:
        keys = summary[0].keys()
        with open(report_file, 'w', newline='', encoding='utf-8') as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(summary)
            
        print(f"Profiling complete. Found {len(summary)} files. Report saved to {report_file}")
    else:
        print("No files found to profile.")

if __name__ == "__main__":
    main()
