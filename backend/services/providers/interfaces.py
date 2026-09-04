from abc import ABC, abstractmethod
from typing import Optional


class ETAProvider(ABC):
    @abstractmethod
    def predict_eta(
        self, train_number: str, journey_id: Optional[str], current_delay: int, schedule: list[dict]
    ) -> Optional[list[dict]]:
        pass


class DelayDNAProvider(ABC):
    @abstractmethod
    def get_delay_dna(self, train_id: str) -> dict:
        pass


class RecoveryProvider(ABC):
    @abstractmethod
    def get_recovery(self, train_id: str) -> dict:
        pass


class PropagationProvider(ABC):
    @abstractmethod
    def get_propagation(self, train_id: str) -> dict:
        pass


class BottleneckProvider(ABC):
    @abstractmethod
    def get_bottlenecks(self) -> list[dict]:
        pass


class ScenarioProvider(ABC):
    @abstractmethod
    def run_what_if(self, request_data: dict) -> dict:
        pass

    @abstractmethod
    def run_simulation(self, request_data: dict) -> dict:
        pass

    @abstractmethod
    def get_scenario(self, scenario_id: str) -> dict:
        pass
