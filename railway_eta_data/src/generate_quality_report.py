"""
generate_quality_report.py
Generates data quality statistics from the processed datasets and decision log.
Run from project root: python src/generate_quality_report.py
"""
import json
import csv
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED = os.path.join(PROJECT_ROOT, "data", "processed")
REPORTS = os.path.join(PROJECT_ROOT, "reports")

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def load_decision_log(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def compute_missing(records, fields):
    """For a list of dicts, compute missing count per field."""
    total = len(records)
    stats = {}
    for field in fields:
        missing = sum(
            1 for r in records
            if r.get(field) is None
            or str(r.get(field, "")).strip() in ("", "None", "null")
        )
        stats[field] = {"missing": missing, "total": total, "pct": round(100 * missing / total, 2) if total else 0}
    return stats

def main():
    os.makedirs(REPORTS, exist_ok=True)

    # ── Load all processed datasets ──
    stations = load_json(os.path.join(PROCESSED, "stations_clean.json"))
    trains = load_json(os.path.join(PROCESSED, "trains_clean.json"))
    schedules = load_json(os.path.join(PROCESSED, "schedules_clean.json"))
    delays = load_json(os.path.join(PROCESSED, "delays_clean.json"))
    decisions = load_decision_log(os.path.join(PROCESSED, "decision_log.csv"))

    # ── Decision counts ──
    dec_counts = Counter(d["decision"] for d in decisions)
    dec_by_source = defaultdict(lambda: Counter())
    for d in decisions:
        dec_by_source[d["source"]][d["decision"]] += 1
    issue_counts = Counter(d["issue_type"] for d in decisions)

    # ── Missing value stats per dataset ──
    stations_fields = ["code", "name", "state", "zone", "address", "lon", "lat"]
    trains_fields = ["number", "name", "type", "type_canonical", "zone",
                     "from_station_code", "to_station_code", "distance",
                     "duration_h", "duration_m", "arrival", "departure",
                     "return_train", "sleeper", "third_ac", "second_ac",
                     "first_ac", "first_class", "chair_car",
                     "from_station_name", "to_station_name"]
    schedules_fields = ["arrival", "day", "train_name", "station_name",
                        "station_code", "id", "train_number", "departure"]
    delays_fields = ["train_number", "delay_min", "cancelled", "snapshot_ts"]

    sta_missing = compute_missing(stations, stations_fields)
    trn_missing = compute_missing(trains, trains_fields)
    sch_missing = compute_missing(schedules, schedules_fields)
    del_missing = compute_missing(delays, delays_fields)

    # ── Write reports/data_quality_report.csv ──
    report_path = os.path.join(REPORTS, "data_quality_report.csv")
    rows = []

    # summary rows
    datasets_info = [
        ("stations_clean.json", "Static", len(stations)),
        ("trains_clean.json", "Static", len(trains)),
        ("schedules_clean.json", "Static", len(schedules)),
        ("delays_clean.json", "Live Snapshot", len(delays)),
    ]
    for name, cat, count in datasets_info:
        rows.append({
            "metric": "dataset_record_count",
            "dataset": name,
            "category": cat,
            "field": "",
            "value": count,
            "pct": "",
        })

    # decision counts
    for decision, count in sorted(dec_counts.items()):
        rows.append({
            "metric": "decision_count",
            "dataset": "ALL",
            "category": "",
            "field": decision,
            "value": count,
            "pct": "",
        })

    # issue type counts
    for issue, count in sorted(issue_counts.items(), key=lambda x: -x[1]):
        rows.append({
            "metric": "issue_type_count",
            "dataset": "ALL",
            "category": "",
            "field": issue,
            "value": count,
            "pct": "",
        })

    # missing values
    for ds_name, missing_stats in [
        ("stations_clean.json", sta_missing),
        ("trains_clean.json", trn_missing),
        ("schedules_clean.json", sch_missing),
        ("delays_clean.json", del_missing),
    ]:
        for field, info in missing_stats.items():
            rows.append({
                "metric": "missing_value",
                "dataset": ds_name,
                "category": "",
                "field": field,
                "value": info["missing"],
                "pct": info["pct"],
            })

    with open(report_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["metric", "dataset", "category", "field", "value", "pct"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Data quality report -> {report_path} ({len(rows)} rows)")

    # ── Print summary to stdout for docs generation ──
    print("\n=== SUMMARY ===")
    print(f"Total datasets: {len(datasets_info)}")
    total_records = sum(c for _, _, c in datasets_info)
    print(f"Total records across all datasets: {total_records:,}")
    print(f"Total decision log entries: {len(decisions):,}")
    print("\nDecision counts:")
    for d, c in sorted(dec_counts.items()):
        print(f"  {d}: {c:,}")
    print("\nIssue types (top 10):")
    for issue, c in issue_counts.most_common(10):
        print(f"  {issue}: {c:,}")
    print("\nDecisions by source:")
    for src in sorted(dec_by_source):
        parts = ", ".join(f"{d}={c}" for d, c in sorted(dec_by_source[src].items()))
        print(f"  {src}: {parts}")

    print("\n=== MISSING VALUES (fields with >0 missing) ===")
    for ds_name, missing_stats in [
        ("stations", sta_missing),
        ("trains", trn_missing),
        ("schedules", sch_missing),
        ("delays", del_missing),
    ]:
        print(f"\n  {ds_name}:")
        for field, info in sorted(missing_stats.items(), key=lambda x: -x[1]["pct"]):
            if info["missing"] > 0:
                print(f"    {field}: {info['missing']:,} / {info['total']:,} ({info['pct']}%)")

if __name__ == "__main__":
    main()
