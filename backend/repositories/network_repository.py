"""
Network repository — all Supabase queries for network intelligence data.
"""

from database.connection import get_supabase_client


class NetworkRepository:
    """Data-access layer for train journeys (network-wide) and bottlenecks."""

    def __init__(self):
        self._db = get_supabase_client()

    def get_running_journeys(self) -> list[dict]:
        """
        Fetch all currently running journeys with their train_states.
        Used to compute network-wide delay statistics.
        """
        response = (
            self._db.table("train_journeys")
            .select("id, train_states(delay_minutes, status)")
            .eq("status", "running")
            .execute()
        )
        return response.data or []

    def get_bottleneck_hotspots(
        self, min_risk_score: float = 0.5, limit: int = 10
    ) -> list[dict]:
        """
        Fetch top bottleneck stations ordered by risk score (descending).
        Includes joined station name.
        """
        response = (
            self._db.table("network_bottlenecks")
            .select(
                "station_code, risk_score, active_train_count, "
                "station:stations(code, name)"
            )
            .gte("risk_score", min_risk_score)
            .order("risk_score", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
