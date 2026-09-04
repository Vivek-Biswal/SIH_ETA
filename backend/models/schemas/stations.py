"""
Pydantic schemas for Station-related API responses.

Matches the OpenAPI contract in shared/api_contracts/api-contract.yaml.
"""

from typing import Optional

from pydantic import BaseModel, Field

from .common import StationRef


class StationDetail(BaseModel):
    """Full station record with geography and infrastructure details."""

    code: str
    name: str
    state: Optional[str] = None
    zone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    platform_count: Optional[int] = None
    is_junction: Optional[bool] = None


class StationSearchResponse(BaseModel):
    """List of stations matching a search query."""

    results: list[StationRef] = []
