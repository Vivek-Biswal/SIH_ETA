"""
export_csv.py
Exports processed JSON datasets to CSV format in data/processed/.
Run from project root: python src/export_csv.py
"""
import json
import csv
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED = os.path.join(PROJECT_ROOT, "data", "processed")


def json_to_csv(json_path, csv_path, fieldnames=None):
    """Convert a JSON list-of-dicts to CSV."""
    with open(json_path, encoding="utf-8") as f:
        records = json.load(f)

    if not records:
        print(f"  SKIP {json_path} -- empty")
        return 0

    if fieldnames is None:
        fieldnames = list(records[0].keys())

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)

    print(f"  {os.path.basename(csv_path)}: {len(records):,} records")
    return len(records)


def main():
    conversions = [
        (
            "stations_clean.json",
            "stations_clean.csv",
            ["code", "name", "state", "zone", "address", "lon", "lat"],
        ),
        (
            "trains_clean.json",
            "trains_clean.csv",
            [
                "number", "name", "type", "type_canonical", "zone",
                "from_station_code", "from_station_name",
                "to_station_code", "to_station_name",
                "distance", "duration_h", "duration_m",
                "arrival", "departure", "return_train",
                "sleeper", "third_ac", "second_ac", "first_ac",
                "first_class", "chair_car",
            ],
        ),
        (
            "schedules_clean.json",
            "schedules_clean.csv",
            [
                "id", "train_number", "train_name",
                "station_code", "station_name",
                "day", "arrival", "departure",
            ],
        ),
        (
            "delays_clean.json",
            "delays_clean.csv",
            ["train_number", "delay_min", "cancelled", "snapshot_ts"],
        ),
    ]

    print("Exporting processed datasets to CSV ...")
    for json_name, csv_name, fields in conversions:
        json_to_csv(
            os.path.join(PROCESSED, json_name),
            os.path.join(PROCESSED, csv_name),
            fieldnames=fields,
        )
    print("Done.")


if __name__ == "__main__":
    main()
