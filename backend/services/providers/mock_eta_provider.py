from typing import Optional

from .interfaces import ETAProvider, DelayDNAProvider, RecoveryProvider


class MockETAProvider(ETAProvider, DelayDNAProvider, RecoveryProvider):
    """
    Mock implementation of ETA, DelayDNA, and Recovery providers.
    Returns structurally correct data with confidence=None and data_state="mock".
    """

    def predict_eta(
        self, train_number: str, journey_id: Optional[str], current_delay: int, schedule: list[dict]
    ) -> Optional[list[dict]]:
        # For mock ETA, we just return the schedule with a small fixed delay added,
        # but the actual logic usually lives in the service (which does a fallback).
        # We can just return None to let the service's own fallback logic handle it,
        # or we could return mock predictions.
        return None

    def get_delay_dna(self, train_id: str) -> dict:
        return {
            "train_id": train_id,
            "contributors": [
                {
                    "factor": "network_congestion",
                    "contribution_minutes": 15,
                    "description": "High traffic on route (mock)",
                }
            ],
            "data_state": "mock",
        }

    def get_recovery(self, train_id: str) -> dict:
        return {
            "current_delay": 30,
            "expected_recovery": 10,
            "expected_remaining_delay": 20,
            "confidence": None,
            "data_state": "mock",
        }
