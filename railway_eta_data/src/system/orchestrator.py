"""
System Orchestrator Module
==========================
Coordinates the entire ETA prediction pipeline:
Request -> State -> Selection -> Calculation -> Response
"""
from typing import Dict, Any, List, Optional
from datetime import datetime

from src.eta.contract import ETARequest, ETAPrediction
from src.eta.predictor import predict_eta
from src.state.builder import TrainStateBuilder
from src.state.contract import TrainState
from src.state.validators import StateValidationError


class ETAOrchestrator:
    """
    Main entry point for unified ETA generation.
    """
    def __init__(self, state_builder: TrainStateBuilder, journeys_lookup: Dict[str, List[Dict[str, Any]]]):
        self.state_builder = state_builder
        self.journeys_lookup = journeys_lookup

    def process_request(self, request_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a raw ETA request dict and return a complete ETAResponse dict.
        """
        try:
            # 1. Validate Request
            train_number = request_dict.get("train_number")
            destination_station = request_dict.get("destination_station")
            current_delay_minutes = request_dict.get("current_delay_minutes")
            request_timestamp = request_dict.get("request_timestamp")
            
            if not train_number:
                return self._error_response("TRAIN_NOT_FOUND", "train_number is required.")
            if not destination_station:
                return self._error_response("DESTINATION_NOT_FOUND", "destination_station is required.")

            # 2. Build TrainState
            state = self.state_builder.build(
                train_number=str(train_number).strip(),
                destination_station=str(destination_station).strip().upper(),
                request_timestamp=request_timestamp,
                provided_delay_minutes=current_delay_minutes
            )

            # 3. Determine available data & baseline
            use_delay = state.current_delay_minutes is not None
            
            # 4 & 5. Select & Generate ETA
            prediction = predict_eta(
                train_number=state.train_number,
                destination_station=state.destination_station,
                journeys_lookup=self.journeys_lookup,
                current_delay_minutes=state.current_delay_minutes,
                prediction_timestamp=datetime.fromisoformat(state.state_timestamp.replace("Z", "+00:00")) if state.state_timestamp else None
            )
            
            if prediction.status != "OK":
                return self._error_response(prediction.status, prediction.message or "Unknown prediction error.")

            # 6, 7 & 8. Build Response
            return self._build_response(state, prediction)

        except StateValidationError as e:
            return self._error_response("INVALID_REQUEST", str(e))
        except Exception as e:
            return self._error_response("SYSTEM_ERROR", f"An unexpected error occurred: {str(e)}")

    def _build_response(self, state: TrainState, prediction: ETAPrediction) -> Dict[str, Any]:
        """
        Constructs the final honest response.
        """
        
        # Determine Data Completeness Status
        completeness = "SCHEDULE_ONLY"
        if state.delay_availability.status == "AVAILABLE":
            completeness = "DELAY_AVAILABLE"
            
        assumptions = list(prediction.assumptions)
        if prediction.prediction_method == "SCHEDULE_BASELINE":
            assumptions.append("The system does not currently know the train's live position or delay.")
        elif prediction.prediction_method == "DELAY_ADJUSTED_BASELINE":
             assumptions.append("The calculation assumes the current delay persists until the destination without recovery or further delay.")
             
        limitations = list(state.system_limitations)
        if state.historical_availability.status == "TEMPORALLY_UNSAFE":
            limitations.append("Historical context (DA323) is available but NOT used for ETA calculation due to unknown temporal provenance.")

        return {
            "train_number": state.train_number,
            "destination_station": state.destination_station,
            "predicted_arrival": prediction.predicted_arrival,
            "prediction_method": prediction.prediction_method,
            "current_delay_minutes": state.current_delay_minutes,
            "data_completeness_status": completeness,
            "assumptions": assumptions,
            "limitations": limitations,
            "status": "OK"
        }

    def _error_response(self, code: str, message: str) -> Dict[str, Any]:
        return {
            "status": "ERROR",
            "error_code": code,
            "message": message
        }
