"""
Leakage Detection Module
========================
Validates that features provided for a prediction do not violate temporal causality.
"""
from typing import Dict, Any, List

class LeakageChecker:
    @staticmethod
    def evaluate_feature(feature_name: str, source: str, availability: str) -> Dict[str, str]:
        """
        Evaluates the leakage risk of a given feature based on its availability category.
        """
        if availability in ("STATIC_AVAILABLE", "SCHEDULE_AVAILABLE"):
            return {
                "feature": feature_name,
                "source": source,
                "temporal_status": "VALID",
                "leakage_risk": "SAFE"
            }
            
        elif availability == "LIVE_AVAILABLE":
            return {
                "feature": feature_name,
                "source": source,
                "temporal_status": "REQUIRES_ALIGNMENT",
                "leakage_risk": "CONDITIONALLY_SAFE"
            }
            
        elif availability == "HISTORICAL_CONTEXT":
            return {
                "feature": feature_name,
                "source": source,
                "temporal_status": "UNKNOWN_PROVENANCE",
                "leakage_risk": "UNSAFE"
            }
            
        else:
            return {
                "feature": feature_name,
                "source": source,
                "temporal_status": "FUTURE_OR_INVALID",
                "leakage_risk": "UNSAFE"
            }

    @staticmethod
    def run_registry_check(registry: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Runs leakage checks over a list of registered features.
        """
        results = []
        for reg in registry:
            res = LeakageChecker.evaluate_feature(
                reg["feature"], 
                reg["source"], 
                reg["availability"]
            )
            reg.update(res)
            results.append(reg)
        return results
