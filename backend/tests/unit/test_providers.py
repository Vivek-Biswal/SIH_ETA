"""
Unit tests for Intelligence Providers.

Tests that the Mock providers return structurally correct data
conforming to the schemas expected by the frontend.
"""
import pytest
from services.providers.mock_eta_provider import MockETAProvider
from services.providers.mock_network_provider import MockNetworkProvider


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture
def eta_provider():
    return MockETAProvider()


@pytest.fixture
def network_provider():
    return MockNetworkProvider()


# ── ETA Provider Tests ─────────────────────────────────────────────────────

class TestMockETAProvider:
    def test_predict_eta_returns_none_for_fallback(self, eta_provider):
        """MockETAProvider.predict_eta returns None to trigger service-level fallback."""
        schedule = [{"station_code": "NDLS", "stop_sequence": 1}]
        result = eta_provider.predict_eta("12301", "j_1", 10, schedule)
        assert result is None  # Mock returns None; the ETAService builds fallback predictions

    def test_delay_dna_returns_valid_structure(self, eta_provider):
        """Delay DNA response must have train_id, contributors list, and data_state."""
        result = eta_provider.get_delay_dna("12301")
        assert result["train_id"] == "12301"
        assert isinstance(result["contributors"], list)
        assert len(result["contributors"]) > 0
        assert result["data_state"] == "mock"

    def test_delay_dna_contributor_has_required_fields(self, eta_provider):
        """Each contributor must have factor, contribution_minutes, description."""
        result = eta_provider.get_delay_dna("12301")
        contributor = result["contributors"][0]
        assert "factor" in contributor
        assert "contribution_minutes" in contributor
        assert isinstance(contributor["contribution_minutes"], int)
        assert "description" in contributor

    def test_delay_dna_with_nonexistent_train(self, eta_provider):
        """Provider should still return structured data for any train_id."""
        result = eta_provider.get_delay_dna("99999")
        assert result["train_id"] == "99999"
        assert result["data_state"] == "mock"

    def test_recovery_returns_valid_structure(self, eta_provider):
        """Recovery response must have delay, recovery, remaining delay, and data_state."""
        result = eta_provider.get_recovery("12301")
        assert "current_delay" in result
        assert "expected_recovery" in result
        assert "expected_remaining_delay" in result
        assert result["data_state"] == "mock"
        # Recovery should not exceed current delay
        assert result["expected_remaining_delay"] == result["current_delay"] - result["expected_recovery"]


# ── Network Provider Tests ─────────────────────────────────────────────────

class TestMockNetworkProvider:
    def test_propagation_returns_valid_structure(self, network_provider):
        """Propagation response must contain source_train, affected_train, and risk."""
        result = network_provider.get_propagation("12301")
        assert result["source_train"] == "12301"
        assert "affected_train" in result
        assert "affected_station" in result
        assert "predicted_delay" in result
        assert result["risk"] in ("low", "medium", "high")
        assert result["data_state"] == "mock"

    def test_bottlenecks_returns_list(self, network_provider):
        """Bottlenecks endpoint must return a non-empty list of bottleneck dicts."""
        result = network_provider.get_bottlenecks()
        assert isinstance(result, list)
        assert len(result) > 0

    def test_bottleneck_entry_has_required_fields(self, network_provider):
        """Each bottleneck must have location, risk, affected_trains, and data_state."""
        result = network_provider.get_bottlenecks()
        entry = result[0]
        assert "location" in entry
        assert "risk" in entry
        assert "affected_trains" in entry
        assert isinstance(entry["affected_trains"], int)
        assert entry["data_state"] == "mock"

    def test_what_if_returns_scenario(self, network_provider):
        """What-if simulation must return a scenario_id and status."""
        result = network_provider.run_what_if({"scenario_type": "speed_restriction"})
        assert "scenario_id" in result
        assert result["status"] == "completed"

    def test_simulation_returns_running_status(self, network_provider):
        """Simulation must return scenario_id and running status."""
        result = network_provider.run_simulation({"scenario_id": "sim_test"})
        assert result["scenario_id"] == "sim_test"
        assert result["status"] == "running"

    def test_get_scenario_returns_result(self, network_provider):
        """Getting a scenario by ID must return matching scenario_id."""
        result = network_provider.get_scenario("sim_001")
        assert result["scenario_id"] == "sim_001"
        assert result["status"] == "completed"
        assert "results" in result

    def test_invalid_scenario_still_returns_structure(self, network_provider):
        """Even a non-existent scenario ID should return a structural response (mock)."""
        result = network_provider.get_scenario("does_not_exist")
        assert result["scenario_id"] == "does_not_exist"
        assert result["status"] == "completed"
