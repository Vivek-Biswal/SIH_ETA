"""
ETA repository — all Supabase queries for ML predictions and delay factors.
"""

from database.connection import get_supabase_client


class ETARepository:
    """Data-access layer for eta_predictions and delay_dna tables."""

    def __init__(self):
        self._db = get_supabase_client()

    def get_predictions(self, journey_id: str) -> list[dict]:
        """
        Fetch stored ML predictions for a journey, newest first.
        Includes joined station reference.
        """
        response = (
            self._db.table("eta_predictions")
            .select(
                "*, station:stations!eta_predictions_station_code_fkey(code, name)"
            )
            .eq("journey_id", journey_id)
            .is_("scenario_id", "null")
            .order("prediction_timestamp", desc=True)
            .execute()
        )
        return response.data or []

    def get_delay_dna(self, journey_id: str) -> list[dict]:
        """
        Fetch delay-DNA factor breakdown for a journey.
        Each row represents a single contributing delay/recovery factor.
        """
        response = (
            self._db.table("delay_dna")
            .select("factor, contribution_minutes, is_recovery")
            .eq("journey_id", journey_id)
            .execute()
        )
        return response.data or []
