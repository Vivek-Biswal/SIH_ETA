"""
Pydantic schemas for Network Intelligence API responses.

Matches the OpenAPI contract in shared/api_contracts/api-contract.yaml.
"""

from typing import Optional

from pydantic import BaseModel, Field


class CongestionHotspot(BaseModel):
    """A single congestion hotspot on the railway network."""

    route_segment: str
    congestion_level: str = "medium"
    affected_trains: int = 0
    average_delay_minutes: int = 0


class NetworkStatusResponse(BaseModel):
    """Network-wide congestion and delay summary."""

    timestamp: Optional[str] = None
    overall_health: str = "normal"
    active_trains: int = 0
    delayed_trains: int = 0
    delay_percentage: float = 0.0
    congestion_hotspots: list[CongestionHotspot] = []


class RouteCongestionResponse(BaseModel):
    """Congestion data for a specific route segment."""

    route_id: str
    congestion_score: float = 0.0
    average_delay_minutes: int = 0
    timestamp: Optional[str] = None
