"""
ETA service — business logic for ML-predicted arrival times.

Orchestrates stored predictions, intelligence adapter calls, schedule-based
fallbacks, and delay factor assembly.

Depends on: TrainRepository, ETARepository, ETAIntelligenceAdapter.
"""

from typing import Optional

from repositories.train_repository import TrainRepository
from repositories.eta_repository import ETARepository
from services.adapters.eta_adapter import ETAIntelligenceAdapter
from models.schemas.trains import (
    ETAResponse,
    StationETA,
    DelayFactor,
)


class ETAService:
    """Orchestrates ETA prediction retrieval and fallback logic."""

    def __init__(
        self,
        train_repo: Optional[TrainRepository] = None,
        eta_repo: Optional[ETARepository] = None,
        eta_adapter: Optional[ETAIntelligenceAdapter] = None,
    ):
        self._train_repo = train_repo or TrainRepository()
        self._eta_repo = eta_repo or ETARepository()
        self._adapter = eta_adapter or ETAIntelligenceAdapter()

    def get_train_eta(
        self, train_number: str, date: Optional[str]
    ) -> Optional[ETAResponse]:
        """
        Get ML-predicted ETA for remaining stations on a train's route.

        Priority:
        1. Live ML inference via the intelligence adapter
        2. Stored predictions from the eta_predictions table
        3. Schedule-based baseline (current delay applied uniformly)

        Returns None if the train does not exist (caller raises 404).
        """
        train = self._train_repo.get_train_by_number(train_number)
        if not train:
            return None

        journey = self._train_repo.get_latest_journey(train_number, date)
        current_delay = self._extract_delay(journey)

        # Attempt live ML prediction
        schedule = self._train_repo.get_schedule(train_number)
        ml_predictions = self._adapter.predict_eta(
            train_number,
            journey["id"] if journey else None,
            current_delay,
            schedule,
        )

        if ml_predictions:
            station_etas = self._parse_ml_predictions(ml_predictions)
            model_version = "ml-live"
            prediction_generated_at = None
        else:
            # Fall back to stored predictions or schedule baseline
            station_etas, model_version, prediction_generated_at = (
                self._get_stored_or_baseline(journey, current_delay, schedule)
            )

        delay_factors = self._build_delay_factors(journey, current_delay)

        return ETAResponse(
            train_number=train["train_number"],
            train_name=train["train_name"],
            date=journey["start_date"] if journey else None,
            prediction_generated_at=prediction_generated_at,
            model_version=model_version,
            overall_delay_minutes=current_delay,
            confidence_score=0.5,
            remaining_stations=station_etas,
            delay_factors=delay_factors,
        )

    # ── Private helpers ──────────────────────────────────────────────────

    @staticmethod
    def _extract_delay(journey: Optional[dict]) -> int:
        """Extract current delay minutes from the journey's train_states."""
        if not journey:
            return 0
        states = journey.get("train_states")
        if not states:
            return 0
        s = states[0] if isinstance(states, list) else states
        return s.get("delay_minutes", 0)

    @staticmethod
    def _parse_ml_predictions(predictions: list[dict]) -> list[StationETA]:
        """Convert raw ML adapter output to StationETA schemas."""
        return [
            StationETA(
                station={"code": p.get("station_code", ""), "name": ""},
                predicted_arrival=p.get("predicted_arr"),
                predicted_delay_minutes=p.get("predicted_arr_delay"),
                prediction_confidence=p.get("confidence", 0.5),
            )
            for p in predictions
        ]

    def _get_stored_or_baseline(
        self,
        journey: Optional[dict],
        current_delay: int,
        schedule: list[dict],
    ) -> tuple[list[StationETA], str, Optional[str]]:
        """
        Try stored predictions from DB; fall back to schedule baseline.

        Returns (station_etas, model_version, prediction_generated_at).
        """
        model_version = "baseline-v0"
        prediction_generated_at = None

        if journey:
            raw_preds = self._eta_repo.get_predictions(journey["id"])
            if raw_preds:
                return self._deduplicate_predictions(
                    raw_preds, model_version
                )

        # Final fallback: schedule + uniform delay
        station_etas = [
            StationETA(
                station=stop.get("station"),
                scheduled_arrival=stop.get("scheduled_arrival"),
                predicted_arrival=stop.get("scheduled_arrival"),
                predicted_delay_minutes=current_delay,
                prediction_confidence=0.5,
            )
            for stop in schedule
        ]
        return station_etas, model_version, None

    @staticmethod
    def _deduplicate_predictions(
        raw_preds: list[dict], default_model_version: str
    ) -> tuple[list[StationETA], str, Optional[str]]:
        """
        Deduplicate stored predictions — keep only the latest timestamp
        batch, one entry per station.
        """
        latest_ts = raw_preds[0].get("prediction_timestamp")
        model_version = raw_preds[0].get("model_version", default_model_version)

        seen: set[str] = set()
        station_etas: list[StationETA] = []
        for p in raw_preds:
            if p.get("prediction_timestamp") != latest_ts:
                continue
            stn_code = p.get("station_code")
            if stn_code in seen:
                continue
            seen.add(stn_code)

            payload = p.get("payload") or {}
            station_etas.append(
                StationETA(
                    station=p.get("station"),
                    scheduled_arrival=None,
                    predicted_arrival=p.get("predicted_arr"),
                    predicted_delay_minutes=p.get("predicted_arr_delay"),
                    prediction_confidence=payload.get("confidence", 0.5),
                )
            )

        return station_etas, model_version, latest_ts

    def _build_delay_factors(
        self, journey: Optional[dict], current_delay: int
    ) -> list[DelayFactor]:
        """Assemble delay factor explanations."""
        factors: list[DelayFactor] = []

        if journey:
            raw_dna = self._eta_repo.get_delay_dna(journey["id"])
            for d in raw_dna:
                sign = -1 if d.get("is_recovery") else 1
                label = "Recovery" if d.get("is_recovery") else "Delay"
                factors.append(
                    DelayFactor(
                        factor=d["factor"],
                        contribution_minutes=d["contribution_minutes"] * sign,
                        description=f"{label}: {d['factor']}",
                    )
                )

        if not factors:
            factors.append(
                DelayFactor(
                    factor="historical_delay",
                    contribution_minutes=current_delay,
                    description="Based on current running delay (ML model not yet active)",
                )
            )

        return factors

    def get_delay_dna(self, train_id: str) -> dict:
        """Delegate to ETAIntelligenceAdapter for Delay DNA."""
        return self._adapter.get_delay_dna(train_id)

    def get_recovery(self, train_id: str) -> dict:
        """Delegate to ETAIntelligenceAdapter for Recovery."""
        return self._adapter.get_recovery(train_id)

    def get_propagation(self, train_id: str) -> dict:
        """Delegate to NetworkIntelligenceAdapter for Propagation."""
        from services.adapters.network_adapter import NetworkIntelligenceAdapter
        network_adapter = NetworkIntelligenceAdapter()
        return network_adapter.get_propagation(train_id)
