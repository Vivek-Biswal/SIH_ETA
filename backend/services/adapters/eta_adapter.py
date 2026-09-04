"""
ETA Intelligence Adapter — integration point for Vivek/Ashwin's ML models.
Delegates to the configured ETAProvider from the factory.
"""

import logging
from typing import Optional

from services.providers.factory import get_eta_provider

logger = logging.getLogger(__name__)


class ETAIntelligenceAdapter:
    """
    Adapter bridging the backend service layer to the Train ETA ML pipeline.
    """

    def __init__(self):
        self._provider = get_eta_provider()

    def predict_eta(
        self,
        train_number: str,
        journey_id: Optional[str],
        current_delay: int,
        schedule: list[dict],
    ) -> Optional[list[dict]]:
        """Request an ETA prediction from the ML model."""
        return self._provider.predict_eta(train_number, journey_id, current_delay, schedule)

    def get_delay_dna(self, train_id: str) -> dict:
        """Request delay contributors from the ML model."""
        return self._provider.get_delay_dna(train_id)

    def get_recovery(self, train_id: str) -> dict:
        """Request expected recovery from the ML model."""
        return self._provider.get_recovery(train_id)
