"""
Feature Contract Module
=======================
Defines the structure for feature records.
"""
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

@dataclass
class StaticFeatureRecord:
    """
    Features that can be built completely using current static data.
    """
    train_number: str
    destination_station: str
    
    # Static Train Features
    train_type: Optional[str] = None
    route_distance: Optional[float] = None
    scheduled_duration_hours: Optional[float] = None
    
    # Route Features
    stop_count: Optional[int] = None
    average_distance_between_stops: Optional[float] = None
    
    # Destination Station Context
    destination_state: Optional[str] = None
    destination_zone: Optional[str] = None
    
    # Historical Context (DA323)
    destination_historical_avg_delay: Optional[float] = None

@dataclass
class DynamicPredictionFeatureRecord:
    """
    Features required for a dynamic ML ETA prediction.
    Many of these are currently unavailable in the real world.
    """
    train_number: str
    prediction_timestamp: Optional[str] = None  # ISO format string or None
    
    # Dynamic Train State (Currently largely missing)
    current_station: Optional[str] = None
    current_delay_minutes: Optional[float] = None
    current_speed: Optional[float] = None  # Unavailable
    
    # Target (Never known at prediction time, populated only in historical training sets)
    actual_arrival_time: Optional[str] = None
    
    # Leakage flag
    prediction_context_complete: bool = False
    
    # The static base
    static_features: Optional[StaticFeatureRecord] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to flat dictionary for CSV reporting."""
        d = {
            "train_number": self.train_number,
            "prediction_timestamp": self.prediction_timestamp,
            "current_station": self.current_station,
            "current_delay_minutes": self.current_delay_minutes,
            "current_speed": self.current_speed,
            "actual_arrival_time": self.actual_arrival_time,
            "prediction_context_complete": self.prediction_context_complete
        }
        if self.static_features:
            sf = self.static_features
            d.update({
                "train_type": sf.train_type,
                "route_distance": sf.route_distance,
                "scheduled_duration_hours": sf.scheduled_duration_hours,
                "stop_count": sf.stop_count,
                "average_distance_between_stops": sf.average_distance_between_stops,
                "destination_station": sf.destination_station,
                "destination_state": sf.destination_state,
                "destination_zone": sf.destination_zone,
                "destination_historical_avg_delay": sf.destination_historical_avg_delay,
            })
        return d
