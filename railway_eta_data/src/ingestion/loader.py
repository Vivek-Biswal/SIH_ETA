import os
import json
import pandas as pd
from datetime import datetime
from typing import Tuple, Any

from .schema_inspector import get_schema_summary

def detect_format(file_path: str) -> str:
    """Detects file format based on extension."""
    _, ext = os.path.splitext(file_path)
    return ext.lower().replace('.', '')

def load_dataset(file_path: str) -> Tuple[Any, int, dict]:
    """
    Loads a dataset based on its file format.
    Returns:
        Tuple containing (loaded_data, record_count, schema_summary)
    """
    fmt = detect_format(file_path)
    data = None
    record_count = 0
    schema_summary = {}

    try:
        if fmt == 'csv':
            data = pd.read_csv(file_path, low_memory=False)
            record_count = len(data)
            schema_summary = get_schema_summary(data)
        elif fmt == 'jsonl':
            data = pd.read_json(file_path, lines=True)
            record_count = len(data)
            schema_summary = get_schema_summary(data)
        elif fmt == 'json':
            # JSON could be a flat list, or a GeoJSON, or dict
            # We try pandas first
            try:
                data = pd.read_json(file_path)
                record_count = len(data)
                schema_summary = get_schema_summary(data)
            except Exception as pandas_err:
                # Fallback to standard json
                with open(file_path, 'r', encoding='utf-8') as f:
                    raw_data = json.load(f)
                
                if isinstance(raw_data, dict) and 'features' in raw_data and raw_data.get('type') == 'FeatureCollection':
                    # GeoJSON
                    data = pd.json_normalize(raw_data['features'])
                    record_count = len(data)
                    schema_summary = get_schema_summary(data)
                elif isinstance(raw_data, list):
                    data = pd.DataFrame(raw_data)
                    record_count = len(data)
                    schema_summary = get_schema_summary(data)
                else:
                    data = raw_data
                    record_count = 1 if isinstance(raw_data, dict) else len(raw_data)
                    schema_summary = {"root": type(data).__name__}
        else:
            raise ValueError(f"Unsupported file format: {fmt}")
            
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        
    return data, record_count, schema_summary
