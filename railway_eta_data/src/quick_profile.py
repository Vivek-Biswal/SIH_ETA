"""
quick_profile.py — print exact sample records and dtypes for all three datasets.
Run from railway_eta_data root.
"""
import json, os, sys

RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "railways")

# ── schedules ────────────────────────────────────────────────
with open(os.path.join(RAW, "schedules.json"), encoding="utf-8") as f:
    sched = json.load(f)

print("=== schedules.json ===")
print("Total records:", len(sched))
print("Keys:", list(sched[0].keys()))
print("Sample[0]:", sched[0])
print("Sample[1]:", sched[1])
# check 'None' strings in arrival
none_arr = sum(1 for r in sched if r.get("arrival") in (None, "None", ""))
print(f"arrival == 'None' or null: {none_arr}")
none_dep = sum(1 for r in sched if r.get("departure") in (None, "None", ""))
print(f"departure == 'None' or null: {none_dep}")
# day field
none_day = sum(1 for r in sched if r.get("day") is None)
print(f"day is None: {none_day}")
# unique days
days = sorted({r.get("day") for r in sched if r.get("day") is not None})
print(f"Unique day values (first 10): {days[:10]}")
print()

# ── stations ─────────────────────────────────────────────────
with open(os.path.join(RAW, "stations.json"), encoding="utf-8") as f:
    st_raw = json.load(f)

stations = st_raw["features"]
print("=== stations.json ===")
print("Total features:", len(stations))
print("Sample[0]:", stations[0])
print("Sample[1] (null geometry):", stations[1])
# geometry null count
null_geom = sum(1 for s in stations if s.get("geometry") is None)
print(f"Null geometry: {null_geom}")
# code patterns
codes = [s["properties"]["code"] for s in stations if s["properties"].get("code")]
xx_codes = [c for c in codes if c.startswith("XX-") or c.startswith("YY-")]
print(f"XX-/YY- placeholder codes: {len(xx_codes)} — examples: {xx_codes[:5]}")
print()

# ── trains ───────────────────────────────────────────────────
with open(os.path.join(RAW, "trains.json"), encoding="utf-8") as f:
    tr_raw = json.load(f)

trains = tr_raw["features"]
print("=== trains.json ===")
print("Total features:", len(trains))
p0 = trains[0]["properties"]
print("Property keys:", list(p0.keys()))
print("Sample[0] properties:", p0)
# type codes
types = list({t["properties"].get("type") for t in trains})
print("Unique type values:", types[:20])
# distance range
dists = [t["properties"].get("distance") for t in trains if t["properties"].get("distance") is not None]
print(f"Distance min={min(dists)}, max={max(dists)}, count={len(dists)}")
print()

# ── delays ───────────────────────────────────────────────────
RAILPULL = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "railpull", "data", "out")
with open(os.path.join(RAILPULL, "delays.json"), encoding="utf-8") as f:
    delays = json.load(f)
print("=== delays.json ===")
print("Top-level keys:", list(delays.keys()))
trains_delays = delays.get("trains", {})
print("Train entries:", len(trains_delays))
items = list(trains_delays.items())[:5]
print("Sample entries:", items)
