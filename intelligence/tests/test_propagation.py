import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.propagation.predictor import predict_propagation_from_raw


def test_propagation_prediction_smoke():
    result = predict_propagation_from_raw(
        station="CSMT",
        source_arr_delay=24,
        source_delay_class="HIGH",
        gap_minutes=3,
    )

    assert 0 <= result["risk_score"] <= 1
    assert 0 <= result["risk_percentage"] <= 100
    assert result["risk_band"] in {
        "LOW",
        "MODERATE",
        "ELEVATED",
        "HIGH",
        "CRITICAL",
    }
    assert result["warning_priority"] in {
        "NO WARNING",
        "MODERATE",
        "HIGH",
        "VERY HIGH",
        "CRITICAL",
    }
