import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ETAPredictor:
    """
    Wrapper for the baseline ETA predictor to match the expected inference interface.
    """
    def __init__(self, model_version: str = "eta-xgboost-v1"):
        self.model_version = model_version
        logger.info(f"Initialized ETAPredictor with version {self.model_version}")

    def predict(
        self,
        train_number: str,
        current_station: Optional[str],
        current_delay: int,
        date: str, # expected to be ignored or parsed if needed
        schedule: list[dict]
    ) -> Optional[list[dict]]:
        """
        Predict ETA using the baseline algorithm.
        """
        try:
            from railway_eta_data.src.eta.predictor import predict_eta
            
            # The predictor expects a journeys_lookup which looks like:
            # { train_number: [ { stationCode, distance, ... }, ... ] }
            # Since we have the schedule passed in, we can construct the lookup for this specific train.
            journeys_lookup = {
                train_number: schedule
            }
            
            # We need the destination station. We assume it's the last station in the schedule.
            if not schedule:
                logger.warning("Empty schedule provided to ETAPredictor")
                return None
                
            destination_station = schedule[-1].get("stationCode", "")
            if not destination_station:
                destination_station = schedule[-1].get("station_code", "")
                
            prediction_timestamp = datetime.now()
            
            prediction = predict_eta(
                train_number=train_number,
                destination_station=destination_station,
                journeys_lookup=journeys_lookup,
                current_delay_minutes=float(current_delay) if current_delay is not None else None,
                current_station=current_station,
                prediction_timestamp=prediction_timestamp
            )
            
            if not prediction or not prediction.station_etas:
                return None
                
            # Convert prediction.station_etas (List[StationETA]) to list[dict]
            # station_etas fields: station_code, predicted_arrival, predicted_departure, distance_from_current, delay_minutes
            result = []
            for station_eta in prediction.station_etas:
                result.append({
                    "station_code": station_eta.station_code,
                    "predicted_arrival": station_eta.predicted_arrival.isoformat() if station_eta.predicted_arrival else None,
                    "predicted_departure": station_eta.predicted_departure.isoformat() if station_eta.predicted_departure else None,
                    "distance_from_current": station_eta.distance_from_current,
                    "delay_minutes": station_eta.delay_minutes,
                })
                
            return result
            
        except Exception as e:
            logger.error(f"Error in ETAPredictor.predict: {e}", exc_info=True)
            return None
