from typing import Optional

from .interfaces import PropagationProvider, BottleneckProvider, ScenarioProvider


class MockNetworkProvider(PropagationProvider, BottleneckProvider, ScenarioProvider):
    """
    Mock implementation of Propagation, Bottleneck, and Scenario providers.
    Returns structurally correct data with confidence=None and data_state="mock".
    """

    def get_propagation(self, train_id: str) -> dict:
        return {
            "source_train": train_id,
            "affected_train": "12302",
            "affected_station": "CNB",
            "predicted_delay": 15,
            "time_window": "2h",
            "risk": "medium",
            "confidence": None,
            "data_state": "mock",
        }

    def get_bottlenecks(self) -> list[dict]:
        return [
            {
                "location": "NDLS",
                "time_window": "2h",
                "risk": "high",
                "affected_trains": 5,
                "reason": "Platform unavailability (mock)",
                "confidence": None,
                "data_state": "mock",
            }
        ]

    def run_what_if(self, request_data: dict) -> dict:
        return {
            "scenario_id": "sim_001_mock",
            "status": "completed",
            "results": {"impact": "minimal", "note": "This is mock data"}
        }

    def run_simulation(self, request_data: dict) -> dict:
        return {
            "scenario_id": request_data.get("scenario_id", "sim_002_mock"),
            "status": "running",
            "results": {}
        }

    def get_scenario(self, scenario_id: str) -> dict:
        return {
            "scenario_id": scenario_id,
            "status": "completed",
            "results": {"impact": "severe delay expected", "note": "This is mock data"}
        }
