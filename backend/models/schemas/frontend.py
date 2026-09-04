"""
Pydantic schemas for the frontend compatibility API endpoints.
These models match the exact fields required by the mobile and web clients.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class DelayContributor(BaseModel):
    factor: str
    contribution_minutes: int
    description: str


class DelayDnaResponse(BaseModel):
    train_id: str
    contributors: List[DelayContributor] = []
    data_state: str = "live"


class RecoveryResponse(BaseModel):
    current_delay: int
    expected_recovery: int
    expected_remaining_delay: int
    confidence: Optional[float] = None
    data_state: str = "live"


class PropagationResponse(BaseModel):
    source_train: str
    affected_train: str
    affected_station: str
    predicted_delay: int
    time_window: str
    risk: str
    confidence: Optional[float] = None
    data_state: str = "live"


class BottleneckResponse(BaseModel):
    location: str
    time_window: str
    risk: str
    affected_trains: int
    reason: str
    confidence: Optional[float] = None
    data_state: str = "live"


class FrontendETAResponse(BaseModel):
    train_id: str
    current_station: str
    current_delay: int
    predicted_eta: str
    expected_recovery: int
    predicted_destination_delay: int
    confidence: Optional[float] = None
    uncertainty: float
    prediction_timestamp: str
    model_version: str
    data_state: str = "live"


class WhatIfRequest(BaseModel):
    scenario_type: str
    parameters: Dict[str, Any]


class SimulationRequest(BaseModel):
    scenario_id: str
    parameters: Dict[str, Any]

class ScenarioResponse(BaseModel):
    scenario_id: str
    status: str
    results: Dict[str, Any]


class RealtimeEvent(BaseModel):
    event_type: str  # e.g., "CRITICAL", "WARNING", "ON_TIME", "INFO"
    train_id: str
    timestamp: str
    data_state: str = "live"
    message: str
    payload: Optional[Dict[str, Any]] = None
