import pandas as pd
from typing import Dict, Any

def get_schema_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Extracts the schema summary from a pandas DataFrame.
    Returns a dictionary mapping column names to their data types.
    """
    schema = {}
    try:
        for col in df.columns:
            schema[col] = str(df[col].dtype)
    except Exception as e:
        print(f"Error generating schema summary: {e}")
    return schema
