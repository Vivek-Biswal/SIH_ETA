import json
import os

repo_dir = r"c:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\railway_eta_data\data\raw\railways"
files = ["stations.json", "trains.json", "schedules.json"]
output_file = r"c:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\railway_eta_data\reports\concise_inspection.txt"

with open(output_file, 'w', encoding='utf-8') as out:
    for f in files:
        path = os.path.join(repo_dir, f)
        out.write(f"=== {f} ===\n")
        
        try:
            with open(path, 'r', encoding='utf-8') as file:
                data = json.load(file)
            
            if isinstance(data, dict):
                if 'features' in data and data.get('type') == 'FeatureCollection':
                    out.write("Format: GeoJSON FeatureCollection\n")
                    features = data['features']
                    out.write(f"Number of records: {len(features)}\n")
                    if len(features) > 0:
                        out.write(f"Sample properties: {list(features[0]['properties'].keys())}\n")
                        
                        missing = {k: 0 for k in features[0]['properties'].keys()}
                        for feat in features:
                            props = feat.get('properties', {})
                            if not props: continue
                            for k in missing.keys():
                                if k not in props or props[k] is None or props[k] == "":
                                    missing[k] += 1
                        out.write(f"Missing values: {missing}\n")
                else:
                    out.write(f"Format: JSON Dict\n")
                    out.write(f"Number of keys: {len(data.keys())}\n")
                    
            elif isinstance(data, list):
                out.write("Format: JSON List\n")
                out.write(f"Number of records: {len(data)}\n")
                if len(data) > 0:
                    out.write(f"Keys: {list(data[0].keys())}\n")
                    out.write(f"Sample: {json.dumps(data[0])}\n")
                    missing = {k: 0 for k in data[0].keys()}
                    for item in data:
                        for k in missing.keys():
                            if k not in item or item[k] is None or item[k] == "":
                                missing[k] += 1
                    out.write(f"Missing values: {missing}\n")
        except Exception as e:
            out.write(f"Error parsing: {e}\n")
        out.write("\n")
