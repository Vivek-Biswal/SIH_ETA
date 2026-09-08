"""
Feature Builder Module
======================
Constructs Feature Records from the loaded dataset lookups.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime

from .contract import StaticFeatureRecord, DynamicPredictionFeatureRecord
from .static_features import get_static_train_features, get_station_context
from .route_features import get_route_features
from .historical_features import get_historical_station_context
from .live_features import get_live_train_state

class FeatureBuilder:
    def __init__(
        self,
        trains_lookup: Dict[str, Dict[str, Any]],
        stations_lookup: Dict[str, Dict[str, Any]],
        journeys_lookup: Dict[str, List[Dict]],
        da323_lookup: Dict[str, Dict[str, Any]],
        delays_lookup: Dict[str, Dict[str, Any]]
    ):
        self.trains_lookup = trains_lookup
        self.stations_lookup = stations_lookup
        self.journeys_lookup = journeys_lookup
        self.da323_lookup = da323_lookup
        self.delays_lookup = delays_lookup

    def build_static_record(self, train_number: str, destination_station: str) -> StaticFeatureRecord:
        """
        Builds a StaticFeatureRecord for the given train and destination.
        """
        t_feat = get_static_train_features(train_number, self.trains_lookup)
        s_feat = get_station_context(destination_station, self.stations_lookup)
        r_feat = get_route_features(train_number, t_feat.get("route_distance"), self.journeys_lookup)
        h_feat = get_historical_station_context(destination_station, self.da323_lookup)
        
        return StaticFeatureRecord(
            train_number=train_number,
            destination_station=destination_station,
            
            train_type=t_feat["train_type"],
            route_distance=t_feat["route_distance"],
            scheduled_duration_hours=t_feat["scheduled_duration_hours"],
            
            stop_count=r_feat["stop_count"],
            average_distance_between_stops=r_feat["average_distance_between_stops"],
            
            destination_state=s_feat["state"],
            destination_zone=s_feat["zone"],
            
            destination_historical_avg_delay=h_feat["historical_average_delay"]
        )

    def build_dynamic_record(
        self, 
        train_number: str, 
        destination_station: str,
        prediction_timestamp: Optional[str] = None
    ) -> DynamicPredictionFeatureRecord:
        """
        Builds a DynamicPredictionFeatureRecord. Since live time-series data is 
        missing, this explicitly marks the context as incomplete.
        """
        static_base = self.build_static_record(train_number, destination_station)
        
        # Only snapshot delay is available in current dataset
        l_feat = get_live_train_state(train_number, self.delays_lookup)
        
        # We explicitly flag that prediction context is incomplete due to missing 
        # actual arrival and true time-aligned observation state
        is_complete = False
        
        return DynamicPredictionFeatureRecord(
            train_number=train_number,
            prediction_timestamp=prediction_timestamp or datetime.utcnow().isoformat(),
            current_station=None, # Missing in dataset
            current_delay_minutes=l_feat["current_delay_minutes"],
            current_speed=None,   # Missing in dataset
            actual_arrival_time=None, # Missing in dataset
            prediction_context_complete=is_complete,
            static_features=static_base
        )
