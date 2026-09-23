
from pathlib import Path
import pandas as pd

from intelligence.propagation.predictor import (
    predict_propagation_from_raw
)


def classify_source_delay(delay):
    """
    Classify source delay using the project's frozen thresholds.
    """
    if delay <= 5:
        return "LOW"
    elif delay <= 15:
        return "MODERATE"
    elif delay <= 60:
        return "HIGH"
    else:
        return "SEVERE"


def simulate_propagation_intervention(
    station,
    source_arr_delay,
    gap_minutes,
    recovery_minutes_list=(0, 5, 10, 15, 20)
):
    """
    Model-based what-if propagation analysis.

    This does NOT represent confirmed railway dispatch outcomes.
    It evaluates how the trained propagation model responds to
    hypothetical reductions in source delay.
    """

    baseline_delay = max(0, float(source_arr_delay))
    scenarios = []

    for recovery in recovery_minutes_list:

        recovery = max(0, float(recovery))

        simulated_delay = max(
            0,
            baseline_delay - recovery
        )

        delay_class = classify_source_delay(
            simulated_delay
        )

        prediction = predict_propagation_from_raw(
            station=station,
            source_arr_delay=simulated_delay,
            source_delay_class=delay_class,
            gap_minutes=gap_minutes
        )

        scenarios.append({
            "scenario": (
                "BASELINE"
                if recovery == 0
                else f"RECOVER {recovery:.0f} MIN"
            ),
            "recovery_minutes": recovery,
            "simulated_source_delay": simulated_delay,
            "source_delay_class": delay_class,
            "risk_score": prediction["risk_score"],
            "risk_percentage": prediction["risk_percentage"],
            "risk_band": prediction["risk_band"],
            "warning": prediction["warning"],
            "warning_priority": prediction["warning_priority"]
        })

    result = pd.DataFrame(scenarios)

    baseline_risk = result.loc[
        result["recovery_minutes"] == 0,
        "risk_score"
    ].iloc[0]

    result["risk_reduction"] = (
        baseline_risk - result["risk_score"]
    )

    result["risk_reduction_percentage"] = (
        result["risk_reduction"] * 100
    )

    result["baseline_risk_score"] = baseline_risk

    return result


def evaluate_what_if_decision(
    scenario_result,
    minimum_risk_reduction=0.01
):
    """
    Evaluate what-if scenarios using predicted propagation risk.

    The result is a model-based decision aid, not a confirmed
    railway dispatch recommendation.
    """

    result = scenario_result.copy()

    baseline_row = result.loc[
        result["scenario"] == "BASELINE"
    ].iloc[0]

    baseline_risk = float(
        baseline_row["risk_score"]
    )

    candidate_row = result.loc[
        result["risk_score"].idxmin()
    ]

    candidate_risk = float(
        candidate_row["risk_score"]
    )

    risk_reduction = (
        baseline_risk - candidate_risk
    )

    if risk_reduction >= minimum_risk_reduction:

        decision_status = (
            "INTERVENTION SHOWS MODELED BENEFIT"
        )

        selected_scenario = (
            candidate_row["scenario"]
        )

        decision_basis = (
            f"Predicted propagation risk decreases by "
            f"{risk_reduction * 100:.2f} percentage points."
        )

    else:

        decision_status = (
            "NO CLEAR MODELED BENEFIT"
        )

        selected_scenario = "BASELINE"

        decision_basis = (
            f"No scenario reduces predicted propagation risk "
            f"by at least "
            f"{minimum_risk_reduction * 100:.1f} percentage points."
        )

    selected_risk = float(
        result.loc[
            result["scenario"] == selected_scenario,
            "risk_score"
        ].iloc[0]
    )

    return {
        "baseline_risk_percentage":
            baseline_risk * 100,

        "selected_scenario":
            selected_scenario,

        "selected_risk_percentage":
            selected_risk * 100,

        "modeled_risk_reduction_percentage_points":
            max(0, risk_reduction * 100),

        "decision_status":
            decision_status,

        "decision_basis":
            decision_basis,

        "decision_type":
            "MODEL-BASED SCENARIO ANALYSIS"
    }
