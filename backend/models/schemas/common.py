"""
Common / shared Pydantic models used across multiple domains.
"""

from typing import Optional

from pydantic import BaseModel, Field


class StationRef(BaseModel):
    """Lightweight station reference (code + display name)."""

    code: str = Field(..., examples=["NDLS"])
    name: str = Field(..., examples=["New Delhi"])


class ErrorDetail(BaseModel):
    """Standard API error envelope — matches the OpenAPI ErrorResponse schema."""

    error: str = Field(..., examples=["NOT_FOUND"])
    message: str = Field(..., examples=["Train 12301 not found"])
    detail: Optional[dict] = None


class PaginationParams(BaseModel):
    """Reusable pagination parameters."""

    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit
