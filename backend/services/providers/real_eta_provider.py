import logging
from typing import Optional

from .interfaces import ETAProvider, DelayDNAProvider, RecoveryProvider

logger = logging.getLogger(__name__)


class RealETAProvider(ETAProvider, DelayDNAProvider, RecoveryProvider):
    """
    Real implementation of ETA, DelayDNA, and Recovery providers.
    Delegates to the prediction modules. If the prediction module raises an exception or
    is not fully implemented, it handles it gracefully.
    """

    def predict_eta(
        self, train_number: str, journey_id: Optional[str], current_delay: int, schedule: list[dict]
    ) -> Optional[list[dict]]:
        # This legacy signature has no timestamped running observation. It cannot
        # construct the causal inputs required by the trained station model.
        # RailRadar's passenger adapter integrates services.eta_ml with verified
        # dated events; the database-only path retains its explicit fallback.
        return None

    def get_delay_dna(self, train_id: str) -> dict:
        try:
            # Future model integration goes here
            return {
                "train_id": train_id,
                "contributors": [],
                "data_state": "unavailable",
            }
        except Exception as e:
            logger.warning("RealETAProvider get_delay_dna failed: %s", e)
            return {
                "train_id": train_id,
                "contributors": [],
                "data_state": "error",
            }

    def get_recovery(self, train_id: str) -> dict:
        try:
            # Future model integration goes here
            return {
                "current_delay": 0,
                "expected_recovery": 0,
                "expected_remaining_delay": 0,
                "confidence": None,
                "data_state": "unavailable",
            }
        except Exception as e:
            logger.warning("RealETAProvider get_recovery failed: %s", e)
            return {
                "current_delay": 0,
                "expected_recovery": 0,
                "expected_remaining_delay": 0,
                "confidence": None,
                "data_state": "error",
            }
