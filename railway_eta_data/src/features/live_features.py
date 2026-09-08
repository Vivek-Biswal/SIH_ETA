"""
Live Features Module
====================
Extracts features from the live delay snapshot data.
"""
from typing import Dict, Any

def get_live_train_state(train_number: str, delays_lookup: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Returns the current known live delay for the train.
    """
    record = delays_lookup.get(str(train_number).strip())
    if not record:
        return {
            "current_delay_minutes": None
        }
        
    try:
        delay = float(record.get("delay", 0))
    except (TypeError, ValueError):
        delay = None
        
    return {
        "current_delay_minutes": delay
    }
