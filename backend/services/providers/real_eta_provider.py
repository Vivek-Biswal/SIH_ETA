import logging
from typing import Optional

from .interfaces import ETAProvider, DelayDNAProvider, RecoveryProvider

logger = logging.getLogger(__name__)


class RealETAProvider(ETAProvider, DelayDNAProvider, RecoveryProvider):
    """
    Real implementation of ETA, DelayDNA, and Recovery providers.
    Delegates to the ML modules. If the ML module raises an exception or
    is not fully implemented, it handles it gracefully.
    """

    def predict_eta(
        self, train_number: str, journey_id: Optional[str], current_delay: int, schedule: list[dict]
    ) -> Optional[list[dict]]:
        try:
            from intelligence.train_eta.inference.predictor import ETAPredictor
            predictor = ETAPredictor(model_version="eta-xgboost-v1")
            
            # extract current station if available in the kwargs or state? 
            # predict_eta signature has train_number, journey_id, current_delay, schedule
            # Let's pass current_station as None and let the predictor handle it based on schedule
            current_station = None
            date = "today" # placeholder
            
            return predictor.predict(train_number, current_station, current_delay, date, schedule)
        except Exception as e:
            logger.warning("RealETAProvider predict_eta failed: %s", e)
            return None

    def get_delay_dna(self, train_id: str) -> dict:
        try:
            # Future ML integration goes here
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
            # Future ML integration goes here
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
