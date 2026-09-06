import json
import os

repo_dir = r"c:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\railway_eta_data\data\raw\railways"
files = ["stations.json", "trains.json", "schedules.json"]

output_file = r"c:\Users\Lenovo\OneDrive\Desktop\GitHub\SIH_ETA\railway_eta_data\reports\inspection_results.txt"

with open(output_file, 'w', encoding='utf-8') as out:
    for f in files:
        path = os.path.join(repo_dir, f)
        out.write(f"--- {f} ---\n")
        try:
            with open(path, 'r', encoding='utf-8') as file:
                data = json.load(file)
            out.write(f"File format: JSON (Raw list/dict)\n")
            if isinstance(data, list):
                out.write(f"Number of records: {len(data)}\n")
                if len(data) > 0 and isinstance(data[0], dict):
                    out.write(f"Structure/Keys (from first record): {list(data[0].keys())}\n")
                    out.write(f"Sample records (first 2): {json.dumps(data[:2], indent=2)}\n")
                    
                    # basic missing value computation for dicts
                    missing = {k: 0 for k in data[0].keys()}
                    for item in data:
                        if isinstance(item, dict):
                            for k in missing.keys():
                                if k not in item or item[k] is None or item[k] == "":
                                    missing[k] += 1
                    out.write(f"Missing values per column:\n{json.dumps(missing, indent=2)}\n")
                else:
                    out.write(f"Sample records (first 2): {json.dumps(data[:2], indent=2)}\n")
            elif isinstance(data, dict):
                out.write(f"Number of records (top-level keys): {len(data.keys())}\n")
                out.write(f"Structure/Keys: {list(data.keys())[:10]}\n")
                out.write(f"Sample records: {json.dumps(list(data.items())[:2], indent=2)}\n")
            else:
                out.write("Unknown structure\n")
        except Exception as e2:
             out.write(f"Failed to parse as JSON: {e2}\n")
        out.write("\n")
