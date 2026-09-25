import logging
import csv
from typing import Optional
from pathlib import Path
import pandas as pd

from .interfaces import PropagationProvider, BottleneckProvider, ScenarioProvider

logger = logging.getLogger(__name__)

# Base directory for the repository
BASE_DIR = Path(__file__).resolve().parents[4]
NOTEBOOKS_DIR = BASE_DIR / "notebooks" / "outputs"


class RealNetworkProvider(PropagationProvider, BottleneckProvider, ScenarioProvider):
    """
    Real implementation of Propagation, Bottleneck, and Scenario providers.
    Delegates to the ML modules and pre-computed CSV files.
    """

    def get_propagation(self, train_id: str) -> dict:
        try:
            csv_path = NOTEBOOKS_DIR / "operational_risk.csv"
            if not csv_path.exists():
                logger.warning(f"File not found: {csv_path}")
                raise FileNotFoundError("operational_risk.csv not found")

            # Simple CSV parsing to find the first relevant row
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("source_train") == str(train_id):
                        return {
                            "source_train": train_id,
                            "affected_train": row.get("target_train", ""),
                            "affected_station": row.get("station", ""),
                            "predicted_delay": int(float(row.get("target_arr_delay", 0))),
                            "time_window": f"{row.get('gap_minutes', 0)} min gap",
                            "risk": row.get("risk_band", "unknown").lower(),
                            "confidence": float(row.get("risk_score", 0)),
                            "data_state": "live",
                            "risk_score": float(row.get("risk_score", 0)),
                            "risk_percentage": float(row.get("risk_score", 0)) * 100,
                            "risk_band": row.get("risk_band", "UNKNOWN"),
                        }

            # If not found, return empty state
            return {
                "source_train": train_id,
                "affected_train": "None",
                "affected_station": "None",
                "predicted_delay": 0,
                "time_window": "N/A",
                "risk": "low",
                "confidence": 0.0,
                "data_state": "live",
            }
        except Exception as e:
            logger.warning("RealNetworkProvider get_propagation failed: %s", e)
            return {
                "source_train": train_id,
                "affected_train": "",
                "affected_station": "",
                "predicted_delay": 0,
                "time_window": "",
                "risk": "unknown",
                "confidence": None,
                "data_state": "error",
            }

    def get_bottlenecks(self) -> list[dict]:
        try:
            csv_path = NOTEBOOKS_DIR / "network_bottlenecks.csv"
            if not csv_path.exists():
                return []

            bottlenecks = []
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    if i >= 10:  # Return top 10
                        break
                    
                    risk_score = float(row.get("mean_risk", 0))
                    if risk_score > 0.6:
                        risk = "critical"
                    elif risk_score > 0.55:
                        risk = "high"
                    else:
                        risk = "medium"

                    bottlenecks.append({
                        "location": row.get("station", "Unknown"),
                        "time_window": "Active",
                        "risk": risk,
                        "affected_trains": int(row.get("high_risk_interactions", 0)),
                        "reason": f"Bottleneck Score: {float(row.get('bottleneck_score', 0)):.2f}",
                        "confidence": risk_score,
                        "data_state": "live",
                        # Extra fields to match the UI requirements if needed
                        "station": row.get("station", "Unknown"),
                        "interactions": int(row.get("interactions", 0)),
                        "mean_risk": risk_score,
                        "high_risk_interactions": int(row.get("high_risk_interactions", 0)),
                        "mean_source_delay": float(row.get("mean_source_delay", 0)),
                        "mean_gap": float(row.get("mean_gap", 0)),
                        "warning_rate": float(row.get("warning_rate", 0)),
                        "bottleneck_score": float(row.get("bottleneck_score", 0)),
                    })
            return bottlenecks
        except Exception as e:
            logger.warning("RealNetworkProvider get_bottlenecks failed: %s", e)
            return []

    def get_operator_alerts(self) -> list[dict]:
        try:
            csv_path = NOTEBOOKS_DIR / "operator_alert_queue.csv"
            if not csv_path.exists():
                return []
            alerts = []
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    if i >= 20: # Limit to top 20 alerts
                        break
                    alerts.append({
                        "service_date": row.get("service_date", ""),
                        "station": row.get("station", ""),
                        "source_train": row.get("source_train", ""),
                        "target_train": row.get("target_train", ""),
                        "source_arr_delay": float(row.get("source_arr_delay", 0) or 0),
                        "target_arr_delay": float(row.get("target_arr_delay", 0) or 0),
                        "gap_minutes": float(row.get("gap_minutes", 0) or 0),
                        "risk_score": float(row.get("risk_score", 0) or 0),
                        "risk_band": row.get("risk_band", ""),
                        "warning_priority": row.get("warning_priority", ""),
                        "alert_message": row.get("alert_message", ""),
                    })
            return alerts
        except Exception as e:
            logger.warning("RealNetworkProvider get_operator_alerts failed: %s", e)
            return []

    def get_top_warnings(self) -> list[dict]:
        try:
            csv_path = NOTEBOOKS_DIR / "top_100_warnings.csv"
            if not csv_path.exists():
                return []
            warnings = []
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    if i >= 100:
                        break
                    warnings.append({
                        "service_date": row.get("service_date", ""),
                        "station": row.get("station", ""),
                        "source_train": row.get("source_train", ""),
                        "target_train": row.get("target_train", ""),
                        "source_arr_delay": float(row.get("source_arr_delay", 0) or 0),
                        "target_arr_delay": float(row.get("target_arr_delay", 0) or 0),
                        "gap_minutes": float(row.get("gap_minutes", 0) or 0),
                        "source_delay_class": row.get("source_delay_class", ""),
                        "risk_score": float(row.get("risk_score", 0) or 0),
                        "risk_band": row.get("risk_band", ""),
                        "warning": row.get("warning", ""),
                        "warning_priority": row.get("warning_priority", ""),
                    })
            return warnings
        except Exception as e:
            logger.warning("RealNetworkProvider get_top_warnings failed: %s", e)
            return []

    def run_what_if(self, request_data: dict) -> dict:
        try:
            from intelligence.decision.decision_engine import simulate_propagation_intervention, evaluate_what_if_decision
            
            # Extract inputs
            station = request_data.get("station", "NDLS")
            source_arr_delay = request_data.get("source_arr_delay", 60)
            gap_minutes = request_data.get("gap_minutes", 10)
            
            # Run simulation
            sim_df = simulate_propagation_intervention(station, source_arr_delay, gap_minutes)
            eval_result = evaluate_what_if_decision(sim_df)
            
            # Format output
            scenarios = sim_df.to_dict(orient="records")
            return {
                "scenario_id": f"what_if_{station}_{source_arr_delay}",
                "status": "completed",
                "results": {
                    "evaluation": eval_result,
                    "scenarios": scenarios
                }
            }
        except Exception as e:
            logger.warning("RealNetworkProvider run_what_if failed: %s", e)
            return {
                "scenario_id": "unknown",
                "status": "failed",
                "results": {"error": str(e)}
            }

    def run_simulation(self, request_data: dict) -> dict:
        return {
            "scenario_id": "sim_live_123",
            "status": "failed",
            "results": {"error": "Use run_what_if instead"}
        }

    def get_scenario(self, scenario_id: str) -> dict:
        return {
            "scenario_id": scenario_id,
            "status": "failed",
            "results": {"error": "Use run_what_if instead"}
        }
