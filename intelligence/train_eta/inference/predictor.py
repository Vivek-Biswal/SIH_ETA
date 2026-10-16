"""Compatibility shim for callers without timestamped running observations.

The old implementation wrapped a schedule baseline and incorrectly named it
XGBoost. Genuine trained inference now lives in backend/services/eta_ml.py and
requires dated station events, a fresh observation, and a validated artifact.
This legacy signature cannot provide those inputs, so it declines inference.
"""
from typing import Optional


class ETAPredictor:
    def __init__(self, model_version: str = 'unavailable-without-observation'):
        self.model_version=model_version

    def predict(self, train_number: str, current_station: Optional[str],
                current_delay: int, date: str, schedule: list[dict]) -> None:
        return None
