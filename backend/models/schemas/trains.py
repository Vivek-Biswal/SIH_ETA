"""
Pydantic schemas for Train-related API requests and responses.

Matches the OpenAPI contract in shared/api_contracts/api-contract.yaml.
"""

from typing import Optional

from pydantic import BaseModel, Field

from .common import StationRef


# ── Request / Query Params ───────────────────────────────────────────────────


class TrainSearchParams(BaseModel):
    """Validated query parameters for the train search endpoint."""

    from_station: str = Field(..., min_length=2, max_length=10)
    to_station: str = Field(..., min_length=2, max_length=10)
    date: Optional[str] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


# ── Train Search Response ────────────────────────────────────────────────────


class TrainSummary(BaseModel):
    """Single train in a search result."""

    train_number: str
    train_name: str
    from_station: Optional[StationRef] = None
    to_station: Optional[StationRef] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    days_of_run: Optional[list[str]] = None
    train_type: Optional[str] = None


class TrainSearchResponse(BaseModel):
    """Paginated list of trains matching a search query."""

    total: int
    page: int
    limit: int
    trains: list[TrainSummary]


# ── Train Status Response ────────────────────────────────────────────────────


class LastKnownLocation(BaseModel):
    """Most recent known position of a train."""

    station: Optional[StationRef] = None
    delay_minutes: int = 0
    updated_at: Optional[str] = None


class StationRunningStatus(BaseModel):
    """Running status of a train at a specific station on its route."""

    station: Optional[StationRef] = None
    scheduled_arrival: Optional[str] = None
    scheduled_departure: Optional[str] = None
    actual_arrival: Optional[str] = None
    actual_departure: Optional[str] = None
    delay_minutes: Optional[int] = None
    has_departed: bool = False
    platform: Optional[str] = None


class TrainStatusResponse(BaseModel):
    """Full live running status of a train."""

    train_number: str
    train_name: str
    date: Optional[str] = None
    current_station: Optional[StationRef] = None
    last_known_location: Optional[LastKnownLocation] = None
    overall_delay_minutes: int = 0
    status: str = "not_started"
    route: list[StationRunningStatus] = []


# ── ETA Response ─────────────────────────────────────────────────────────────


class StationETA(BaseModel):
    """ML-predicted ETA at a specific station."""

    station: Optional[StationRef] = None
    scheduled_arrival: Optional[str] = None
    predicted_arrival: Optional[str] = None
    predicted_delay_minutes: Optional[int] = None
    prediction_confidence: float = 0.5


class DelayFactor(BaseModel):
    """A single factor contributing to delay (positive) or recovery (negative)."""

    factor: str
    contribution_minutes: int = 0
    description: str = ""


class ETAResponse(BaseModel):
    """ML-predicted ETA for all remaining stations on a train's route."""

    train_number: str
    train_name: str
    date: Optional[str] = None
    prediction_generated_at: Optional[str] = None
    model_version: str = "baseline-v0"
    overall_delay_minutes: int = 0
    confidence_score: float = 0.5
    remaining_stations: list[StationETA] = []
    delay_factors: list[DelayFactor] = []
