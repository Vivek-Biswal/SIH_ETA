
import joblib
from pathlib import Path

import numpy as np
import pandas as pd


# ============================================================
# MODEL ARTIFACTS
# ============================================================

MODULE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    MODULE_DIR
    / "models"
    / "propagation_rf_temporal.pkl"
)

FEATURES_PATH = (
    MODULE_DIR
    / "models"
    / "propagation_feature_names.pkl"
)


# ============================================================
# LOAD FROZEN MODEL
# ============================================================

propagation_model = joblib.load(MODEL_PATH)

propagation_features = joblib.load(FEATURES_PATH)

propagation_features = list(propagation_features)


# ============================================================
# RISK PREDICTOR
# ============================================================

def predict_propagation_risk(feature_row):
    """
    Predict propagation risk from an already encoded feature row.
    """

    if isinstance(feature_row, pd.Series):
        feature_row = feature_row.to_frame().T

    missing_features = [
        col
        for col in propagation_features
        if col not in feature_row.columns
    ]

    if missing_features:
        raise ValueError(
            f"Missing model features: {missing_features[:10]}"
        )

    model_input = feature_row[
        propagation_features
    ].copy()

    risk_score = propagation_model.predict_proba(
        model_input
    )[0, 1]

    if risk_score < 0.47:
        risk_band = "LOW"

    elif risk_score < 0.50:
        risk_band = "MODERATE"

    elif risk_score < 0.55:
        risk_band = "ELEVATED"

    elif risk_score < 0.60:
        risk_band = "HIGH"

    else:
        risk_band = "CRITICAL"

    warning = risk_score >= 0.48

    if risk_score >= 0.60:
        warning_priority = "CRITICAL"

    elif risk_score >= 0.55:
        warning_priority = "VERY HIGH"

    elif risk_score >= 0.50:
        warning_priority = "HIGH"

    elif risk_score >= 0.48:
        warning_priority = "MODERATE"

    else:
        warning_priority = "NO WARNING"

    return {
        "risk_score": float(risk_score),
        "risk_percentage": float(risk_score * 100),
        "risk_band": risk_band,
        "warning": bool(warning),
        "warning_priority": warning_priority
    }


# ============================================================
# BACKEND-FRIENDLY RAW INPUT PREDICTOR
# ============================================================

def predict_propagation_from_raw(
    station,
    source_arr_delay,
    source_delay_class,
    gap_minutes
):
    """
    Predict propagation risk directly from raw operational inputs.
    """

    raw = pd.DataFrame([{
        "source_arr_delay": source_arr_delay,
        "source_delay_class": source_delay_class,
        "gap_minutes": gap_minutes,
        "station": station
    }])

    encoded = pd.get_dummies(
        raw,
        columns=[
            "source_delay_class",
            "station"
        ],
        drop_first=True
    )

    encoded = encoded.reindex(
        columns=propagation_features,
        fill_value=0
    )

    result = predict_propagation_risk(
        encoded
    )

    result["station"] = station
    result["source_arr_delay"] = source_arr_delay
    result["source_delay_class"] = source_delay_class
    result["gap_minutes"] = gap_minutes

    return result
