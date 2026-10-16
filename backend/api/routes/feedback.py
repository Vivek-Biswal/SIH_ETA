"""Anonymous, unverified ETA feedback; no provider API call is made."""
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator
from services.eta_feedback import record_feedback

router = APIRouter(prefix="/api/v1/passenger", tags=["passenger"])


class EtaFeedback(BaseModel):
    model_config = ConfigDict(extra="forbid")
    report_id: str = Field(pattern=r"^[a-f0-9]{32}$")
    train_number: str = Field(pattern=r"^\d{5}$")
    journey_date: date
    station_code: str = Field(pattern=r"^[A-Z0-9]{1,10}$")
    route_sequence: int | None = Field(default=None, ge=0, le=10000)
    rating: Literal["accurate", "inaccurate", "unavailable"]
    reason: Literal["train_delayed", "train_early", "unexpected_stop", "route_disruption",
                    "weather", "technical", "other"] | None = None
    comment: str = Field(default="", max_length=500)
    predicted_arrival: datetime | None = None
    observation_timestamp: datetime | None = None
    model_version: str | None = Field(default=None, max_length=100)

    @field_validator("predicted_arrival", "observation_timestamp")
    @classmethod
    def aware_timestamp(cls, value):
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("Timestamp must include its time zone")
        return value


@router.post("/eta-feedback", status_code=201)
def submit_eta_feedback(report: EtaFeedback):
    return record_feedback(report)
