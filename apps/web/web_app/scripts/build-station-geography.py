"""Build compact static geography from the repository's existing station dataset.

This directory represents station locations, not live train positions or tracks.
Only unambiguous KEEP records with valid coordinates are included.
"""
import json
import math
from pathlib import Path

web = Path(__file__).resolve().parents[1]
source = web.parents[2] / 'railway_eta_data/data/processed/stations_clean.json'
points = {}
conflicts = set()
for station in json.loads(source.read_text(encoding='utf-8')):
    lat, lon = station.get('lat'), station.get('lon')
    code = station.get('code', '').upper()
    if (not code or station.get('_status') != 'KEEP'
            or type(lat) not in (int, float) or type(lon) not in (int, float)
            or not math.isfinite(lat) or not math.isfinite(lon)
            or not -90 <= lat <= 90 or not -180 <= lon <= 180):
        continue
    point = [lat, lon]
    if code in points and points[code] != point:
        conflicts.add(code)
    points[code] = point
for code in conflicts:
    points.pop(code, None)
(web / 'public/station-geography.json').write_text(json.dumps(points, separators=(',', ':'), sort_keys=True), encoding='utf-8')
print(f'Exported {len(points)} station locations; excluded {len(conflicts)} ambiguous codes.')
