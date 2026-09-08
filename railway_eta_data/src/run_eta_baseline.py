"""
ETA Baseline Demonstration Runner
===================================
Loads reconstructed journeys and demonstrates both ETA baselines.
Does NOT modify raw or processed data.
Does NOT train a model.
Does NOT create synthetic actual arrival times.
"""
import json
import os
import sys
from pprint import pprint

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import PROCESSED_DATA_DIR
from eta.predictor import predict_eta, build_journeys_lookup


def load_journeys(path: str) -> list:
    print(f"Loading journeys from {path} ...")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def print_prediction(pred) -> None:
    print(f"\n  Train         : {pred.train_number}")
    print(f"  Destination   : {pred.destination_station}")
    print(f"  Method        : {pred.prediction_method}")
    print(f"  Status        : {pred.status}")
    if pred.status == "OK":
        print(f"  Sched Arrival : {pred.scheduled_arrival}  (Day {pred.scheduled_day})")
        print(f"  ETA           : {pred.predicted_arrival}  (Day {pred.predicted_day})")
        if pred.current_delay_minutes is not None:
            print(f"  Delay Applied : {pred.current_delay_minutes} min")
        print(f"  Assumptions   :")
        for a in pred.assumptions:
            print(f"    - {a}")
    else:
        print(f"  Error         : {pred.message}")


def main():
    journeys_path = os.path.join(PROCESSED_DATA_DIR, "journeys_scheduled.json")
    journeys = load_journeys(journeys_path)
    lookup = build_journeys_lookup(journeys)

    print(f"\nLoaded {len(lookup)} trains into lookup.")

    # Pick a real train from the data for demonstration
    sample_train = next(iter(lookup))
    sample_route = lookup[sample_train]

    # Pick a mid-route station and destination
    if len(sample_route) >= 3:
        origin = sample_route[0]["station"]
        destination = sample_route[-1]["station"]
        current = sample_route[1]["station"]
    else:
        origin = sample_route[0]["station"]
        destination = sample_route[-1]["station"]
        current = None

    print("=" * 60)
    print("EXAMPLE 1 — Schedule Baseline (no delay)")
    print("=" * 60)
    pred1 = predict_eta(
        train_number=sample_train,
        destination_station=destination,
        journeys_lookup=lookup,
    )
    print_prediction(pred1)

    print("\n" + "=" * 60)
    print("EXAMPLE 2 — Delay-Adjusted Baseline (20 min delay)")
    print("=" * 60)
    pred2 = predict_eta(
        train_number=sample_train,
        destination_station=destination,
        journeys_lookup=lookup,
        current_delay_minutes=20,
        current_station=current,
    )
    print_prediction(pred2)

    print("\n" + "=" * 60)
    print("EXAMPLE 3 — Invalid Destination")
    print("=" * 60)
    pred3 = predict_eta(
        train_number=sample_train,
        destination_station="INVALID_STN",
        journeys_lookup=lookup,
    )
    print_prediction(pred3)

    print("\n" + "=" * 60)
    print("EXAMPLE 4 — Invalid Train Number")
    print("=" * 60)
    pred4 = predict_eta(
        train_number="00000",
        destination_station=destination,
        journeys_lookup=lookup,
    )
    print_prediction(pred4)

    print("\n" + "=" * 60)
    print("EXAMPLE 5 — Overnight/Multi-day Journey (large delay)")
    print("=" * 60)
    # Find a station that is on day 2 if possible
    day2_stops = [s for s in sample_route if (s.get("day") or 1) > 1]
    if day2_stops:
        dest_day2 = day2_stops[0]["station"]
        pred5 = predict_eta(
            train_number=sample_train,
            destination_station=dest_day2,
            journeys_lookup=lookup,
            current_delay_minutes=90,
        )
        print_prediction(pred5)
    else:
        print("  (No multi-day stops on this train; skipped.)")

    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)
    print("\nIMPORTANT: These are schedule-based estimates only.")
    print("No ML model was used. No actual arrival data exists.")


if __name__ == "__main__":
    main()
