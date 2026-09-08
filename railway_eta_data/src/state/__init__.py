"""
Unified Train State Module
==========================
Defines the `TrainState` contract and data availability metadata.
"""

from .contract import TrainState, DataAvailability
from .builder import TrainStateBuilder
from .validators import StateValidationError

__all__ = ["TrainState", "DataAvailability", "TrainStateBuilder", "StateValidationError"]
