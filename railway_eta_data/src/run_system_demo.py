"""
System End-to-End Demo
======================
Demonstrates the unified ETA prediction pipeline for Chunk 6.
"""
import os
import sys
import json
import pprint
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import PROCESSED_DATA_DIR
from src.system.orchestrator import ETAOrchestrator
from src.state.builder import TrainStateBuilder
from src.eta.predictor import build_journeys_lookup
from src.run_delay_analysis import list_to_dict

def load_json(filename):
    with open(os.path.join(PROCESSED_DATA_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)

def run_demo():
    print("Loading datasets...")
    raw_trains = load_json("trains_clean.json")
    raw_journeys = load_json("journeys_scheduled.json")
    
    # We load delays_clean, but for demo scenarios we will explicitly pass delays to the orchestrator 
    # to control the test conditions.
    # We skip DA323 since it's temporally unsafe and the orchestrator is built to ignore it for predictions.
    
    trains_lookup = list_to_dict(raw_trains, "number")
    journeys_lookup = build_journeys_lookup(raw_journeys)
    
    builder = TrainStateBuilder(
        trains_lookup=trains_lookup,
        journeys_lookup=journeys_lookup,
        historical_lookup={}, # Explicitly empty to demonstrate we don't rely on DA323
        live_delays_lookup={} # We will inject delay via request
    )
    
    orchestrator = ETAOrchestrator(state_builder=builder, journeys_lookup=journeys_lookup)

    scenarios = [
        {
            "name": "SCENARIO 1: Schedule-only request",
            "request": {
                "train_number": "12001",
                "destination_station": "NDLS",
                "request_timestamp": datetime.now().isoformat()
            }
        },
        {
             "name": "SCENARIO 2: Request with valid current delay",
             "request": {
                 "train_number": "12001",
                 "destination_station": "NDLS",
                 "current_delay_minutes": 45.0,
                 "request_timestamp": datetime.now().isoformat()
             }
        },
        {
             "name": "SCENARIO 3: Invalid train",
             "request": {
                 "train_number": "99999",
                 "destination_station": "NDLS",
                 "request_timestamp": datetime.now().isoformat()
             }
        },
        {
             "name": "SCENARIO 4: Destination not on route",
             "request": {
                 "train_number": "12001",
                 "destination_station": "CSTM",
                 "request_timestamp": datetime.now().isoformat()
             }
        },
        {
             "name": "SCENARIO 5: Missing live context (explicitly missing delay)",
             "request": {
                 "train_number": "12001",
                 "destination_station": "NDLS",
                 "current_delay_minutes": None,
                 "request_timestamp": datetime.now().isoformat()
             }
        }
    ]

    for s in scenarios:
        print(f"\n{'='*50}")
        print(s["name"])
        print(f"{'='*50}")
        print("REQUEST:")
        pprint.pprint(s["request"])
        print("\nRESPONSE:")
        response = orchestrator.process_request(s["request"])
        pprint.pprint(response)

if __name__ == "__main__":
    run_demo()
