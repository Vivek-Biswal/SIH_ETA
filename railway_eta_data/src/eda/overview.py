import pandas as pd
import numpy as np

def dataset_overview(datasets: dict) -> pd.DataFrame:
    """
    Creates an overview of all datasets.
    datasets: dict of {name: (df, classification)}
    """
    rows = []
    
    for name, (df, classification) in datasets.items():
        if df is None or df.empty:
            continue
            
        record_count = len(df)
        column_count = len(df.columns)
        missing_values = df.isnull().sum().sum()
        # Count duplicates safely
        try:
            duplicate_records = df.duplicated().sum()
        except TypeError:
            # Handle unhashable types by converting lists/dicts to strings temporarily
            duplicate_records = df.astype(str).duplicated().sum()
        # Count unique trains and stations if applicable
        unique_trains = np.nan
        unique_stations = np.nan
        
        if 'train_number' in df.columns:
            unique_trains = df['train_number'].nunique()
        elif 'number' in df.columns and name == 'trains':
            unique_trains = df['number'].nunique()
            
        if 'station_code' in df.columns:
            unique_stations = df['station_code'].nunique()
        elif 'code' in df.columns and name == 'stations':
            unique_stations = df['code'].nunique()
            
        # Compile data types
        dtypes_str = ", ".join([f"{col}: {str(dt)}" for col, dt in df.dtypes.items()])
            
        rows.append({
            'dataset_name': name,
            'classification': classification,
            'record_count': record_count,
            'column_count': column_count,
            'missing_values': missing_values,
            'duplicate_records': duplicate_records,
            'unique_trains': unique_trains,
            'unique_stations': unique_stations,
            'data_types': dtypes_str
        })
        
    return pd.DataFrame(rows)
