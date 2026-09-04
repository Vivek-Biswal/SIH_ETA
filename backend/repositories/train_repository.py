"""
Train repository — all Supabase queries for train-related data.

This is the ONLY layer that imports database.connection or touches the
Supabase client.  Methods return raw Python dicts/lists.
"""

from typing import Optional

from database.connection import get_supabase_client


class TrainRepository:
    """Data-access layer for trains, journeys, schedules, and observations."""

    def __init__(self):
        self._db = get_supabase_client()

    # ── Train search ─────────────────────────────────────────────────────

    def search_trains(
        self,
        from_station: str,
        to_station: str,
        offset: int,
        limit: int,
    ) -> tuple[list[dict], int]:
        """
        Search trains running between two stations.

        Returns:
            (rows, total_count) — rows include joined station refs.
        """
        response = (
            self._db.table("trains")
            .select(
                "*, from_station_ref:stations!trains_from_station_fkey(code, name), "
                "to_station_ref:stations!trains_to_station_fkey(code, name)",
                count="exact",
            )
            .eq("from_station", from_station.upper())
            .eq("to_station", to_station.upper())
            .range(offset, offset + limit - 1)
            .execute()
        )
        return response.data or [], response.count or 0

    # ── Single train lookup ──────────────────────────────────────────────

    def get_train_by_number(self, train_number: str) -> Optional[dict]:
        """Return a single train record or None."""
        response = (
            self._db.table("trains")
            .select("*")
            .eq("train_number", train_number)
            .execute()
        )
        return response.data[0] if response.data else None

    # ── Journeys ─────────────────────────────────────────────────────────

    def get_latest_journey(
        self, train_number: str, date: Optional[str] = None
    ) -> Optional[dict]:
        """
        Fetch the latest journey for a train, optionally filtered by date.
        Includes nested train_states join.
        """
        query = (
            self._db.table("train_journeys")
            .select("*, train_states(*)")
            .eq("train_number", train_number)
            .order("start_date", desc=True)
            .limit(1)
        )
        if date:
            query = query.eq("start_date", date)

        response = query.execute()
        return response.data[0] if response.data else None

    # ── Schedule ─────────────────────────────────────────────────────────

    def get_schedule(self, train_number: str) -> list[dict]:
        """Return the ordered schedule (route stops) for a train."""
        response = (
            self._db.table("schedules")
            .select(
                "*, station:stations!schedules_station_code_fkey(code, name)"
            )
            .eq("train_number", train_number)
            .order("stop_sequence")
            .execute()
        )
        return response.data or []

    # ── Station observations ─────────────────────────────────────────────

    def get_station_observations(self, journey_id: str) -> list[dict]:
        """Return actual arrival/departure observations for a journey."""
        response = (
            self._db.table("station_observations")
            .select("station_code, act_arr, act_dep, arr_delay, dep_delay")
            .eq("journey_id", journey_id)
            .execute()
        )
        return response.data or []

    # ── Station code → name resolution ───────────────────────────────────

    def get_station_ref(self, station_code: str) -> Optional[dict]:
        """Resolve a station code to {code, name}."""
        response = (
            self._db.table("stations")
            .select("code, name")
            .eq("code", station_code)
            .execute()
        )
        return response.data[0] if response.data else None
