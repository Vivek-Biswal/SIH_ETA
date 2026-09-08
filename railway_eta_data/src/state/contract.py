"""
Unified Train State Module
==========================
Defines the `TrainState` contract and data availability metadata.
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

@dataclass
class DataAvailability:
    """
    Explicitly tracks the availability and scientific safety of data fields.
    """
    status: str  # AVAILABLE, NOT_AVAILABLE, UNKNOWN, TEMPORALLY_UNSAFE, SCHEDULED_ONLY, LIVE_REQUIRED, HISTORICAL_AGGREGATED
    source: Optional[str] = None
    limitations: List[str] = field(default_factory=list)

@dataclass
class TrainState:
    """
    Unified representation of everything the system knows about a train at a given moment.
    Fields that are missing must be explicitly set to None, with an appropriate DataAvailability status.
    """
    train_number: str
    state_timestamp: str

    # Static/Scheduled context
    train_type: Optional[str] = None
    train_type_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))
    
    scheduled_journey: List[Dict[str, Any]] = field(default_factory=list)
    journey_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))

    route_distance: Optional[float] = None
    route_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))

    # Live context
    current_delay_minutes: Optional[float] = None
    delay_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))
    
    delay_timestamp: Optional[str] = None

    current_station: Optional[str] = None
    current_station_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))

    current_position: Optional[Dict[str, float]] = None # {lat, lon}
    position_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))

    current_speed: Optional[float] = None
    speed_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))

    next_station: Optional[str] = None
    next_station_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))

    # Historical context
    historical_station_context: Dict[str, Any] = field(default_factory=dict)
    historical_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))

    # Destination context
    destination_station: Optional[str] = None
    destination_availability: DataAvailability = field(default_factory=lambda: DataAvailability("NOT_AVAILABLE"))

    # System limitations
    system_limitations: List[str] = field(default_factory=lambda: [
        "Live position, speed, and actual historical trajectories are currently unavailable."
    ])
