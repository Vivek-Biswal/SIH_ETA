"""
Compatibility router for frontend applications.
Provides un-versioned /api/* endpoints mapping to the respective controllers.
"""

from typing import Optional, List
from fastapi import APIRouter, Query

from api.controllers.train_controller import TrainController
from api.controllers.network_controller import NetworkController
from models.schemas.frontend import (
    DelayDnaResponse,
    RecoveryResponse,
    PropagationResponse,
    BottleneckResponse,
    FrontendETAResponse,
    WhatIfRequest,
    SimulationRequest,
    ScenarioResponse
)
from models.schemas.trains import TrainSearchResponse, TrainStatusResponse

router = APIRouter(prefix="/api", tags=["frontend-compat"])

_train_controller = TrainController()
_network_controller = NetworkController()


@router.get("/trains")
async def search_trains(
    from_station: str = Query(..., min_length=2, max_length=10),
    to_station: str = Query(..., min_length=2, max_length=10),
    date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Fallback to search logic if they query trains list."""
    return await _train_controller.search_trains(from_station, to_station, date, page, limit)


@router.get("/trains/{train_id}")
async def get_train_info(train_id: str):
    """Basic train status/info."""
    return await _train_controller.get_train_status(train_id, None)


@router.get("/trains/{train_id}/state")
async def get_train_state(train_id: str):
    """Train running state."""
    return await _train_controller.get_train_status(train_id, None)


@router.get("/trains/{train_id}/eta", response_model=FrontendETAResponse)
async def get_train_eta(train_id: str):
    """Train ETA with frontend-specific schema."""
    result = await _train_controller.get_train_eta(train_id, None)
    
    # Map from the old ETAResponse to the frontend expected structure
    # (Handling stubbing for missing fields)
    current_station_code = result.remaining_stations[0].station.code if result.remaining_stations and result.remaining_stations[0].station else "UNKNOWN"
    
    return FrontendETAResponse(
        train_id=train_id,
        current_station=current_station_code,
        current_delay=result.overall_delay_minutes,
        predicted_eta=result.remaining_stations[-1].predicted_arrival if result.remaining_stations else "UNKNOWN",
        expected_recovery=0,
        predicted_destination_delay=result.overall_delay_minutes,
        confidence=result.confidence_score,
        uncertainty=0.1,
        prediction_timestamp=result.prediction_generated_at or "UNKNOWN",
        model_version=result.model_version,
        data_state="live"
    )


@router.get("/trains/{train_id}/delay-dna", response_model=DelayDnaResponse)
async def get_train_delay_dna(train_id: str):
    """Delay DNA contributors."""
    res = await _train_controller.get_delay_dna(train_id)
    return DelayDnaResponse(**res)


@router.get("/trains/{train_id}/recovery", response_model=RecoveryResponse)
async def get_train_recovery(train_id: str):
    """Expected recovery analysis."""
    res = await _train_controller.get_recovery(train_id)
    return RecoveryResponse(**res)


@router.get("/trains/{train_id}/propagation", response_model=PropagationResponse)
async def get_train_propagation(train_id: str):
    """Propagation impact analysis."""
    res = await _train_controller.get_propagation(train_id)
    return PropagationResponse(**res)


@router.get("/network")
async def get_network():
    """Network status."""
    return await _network_controller.get_network_status()


@router.get("/network/bottlenecks", response_model=List[BottleneckResponse])
async def get_network_bottlenecks():
    """Network bottlenecks."""
    res = await _network_controller.get_bottlenecks()
    return [BottleneckResponse(**b) for b in res]


@router.post("/what-if", response_model=ScenarioResponse)
async def create_what_if(request: WhatIfRequest):
    """Run what-if scenario."""
    res = await _network_controller.run_what_if(request.model_dump())
    return ScenarioResponse(**res)


@router.post("/simulation", response_model=ScenarioResponse)
async def create_simulation(request: SimulationRequest):
    """Run simulation."""
    res = await _network_controller.run_simulation(request.model_dump())
    return ScenarioResponse(**res)


@router.get("/scenarios/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(scenario_id: str):
    """Get scenario results."""
    res = await _network_controller.get_scenario(scenario_id)
    return ScenarioResponse(**res)
