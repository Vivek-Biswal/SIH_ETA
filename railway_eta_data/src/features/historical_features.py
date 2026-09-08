"""
Historical Features Module
==========================
Extracts aggregated historical features (e.g. from DA323).
Note: These are explicitly tracked as TEMPORALLY_UNSAFE_OR_UNKNOWN.
"""
from typing import Dict, Any

def get_historical_station_context(station_code: str, da323_lookup: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Returns historical average delay for a given station.
    """
    record = da323_lookup.get(str(station_code).strip().upper())
    if not record:
        return {
            "historical_average_delay": None
        }
        
    try:
        avg_delay = float(record.get("avg_delay_minutes", 0))
    except (TypeError, ValueError):
        avg_delay = None
        
    return {
        "historical_average_delay": avg_delay
    }
