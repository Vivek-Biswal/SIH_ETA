"""
Route Features Module
======================
Extracts structural route features from the reconstructed journeys.
"""
from typing import Dict, Any, List

def get_route_features(train_number: str, route_distance: float, journeys_lookup: Dict[str, List[Dict]]) -> Dict[str, Any]:
    """
    Returns structural features for the train's route.
    """
    route = journeys_lookup.get(str(train_number).strip())
    
    if not route or len(route) == 0:
        return {
            "stop_count": None,
            "average_distance_between_stops": None
        }
        
    stop_count = len(route)
    
    if route_distance and stop_count > 1:
        avg_dist = route_distance / (stop_count - 1)
    else:
        avg_dist = None
        
    return {
        "stop_count": stop_count,
        "average_distance_between_stops": avg_dist
    }
