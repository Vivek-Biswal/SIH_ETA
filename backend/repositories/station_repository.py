"""
Station repository — all Supabase queries for station-related data.
"""

from typing import Optional

from database.connection import get_supabase_client


class StationRepository:
    """Data-access layer for the stations table."""

    def __init__(self):
        self._db = get_supabase_client()

    def search_by_code_prefix(self, query: str, limit: int = 20) -> list[dict]:
        """Search stations whose code starts with *query* (case-insensitive)."""
        response = (
            self._db.table("stations")
            .select("code, name")
            .ilike("code", f"{query}%")
            .limit(limit)
            .execute()
        )
        return response.data or []

    def search_by_name(self, query: str, limit: int = 20) -> list[dict]:
        """Search stations whose name contains *query* (case-insensitive)."""
        response = (
            self._db.table("stations")
            .select("code, name")
            .ilike("name", f"%{query}%")
            .limit(limit)
            .execute()
        )
        return response.data or []

    def get_by_code(self, station_code: str) -> Optional[dict]:
        """Return the full station record or None."""
        response = (
            self._db.table("stations")
            .select("*")
            .eq("code", station_code.upper())
            .execute()
        )
        return response.data[0] if response.data else None
