import os
import sys
import json
import pandas as pd

# Adjust path to import from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src import config
from src.journey.reconstruct import reconstruct_journeys
from src.journey.validators import validate_journey

def main():
    print("============================================================")
    print("RUNNING SCHEDULED JOURNEY RECONSTRUCTION")
    print("============================================================")
    
    schedules_path = os.path.join(config.PROCESSED_DATA_DIR, "schedules_clean.json")
    if not os.path.exists(schedules_path):
        print(f"Error: {schedules_path} not found.")
        sys.exit(1)
        
    print("Loading schedules...")
    df_sched = pd.read_json(schedules_path)
    
    print("Reconstructing journeys...")
    journeys = reconstruct_journeys(df_sched)
    print(f"Reconstructed {len(journeys)} scheduled journeys.")
    
    print("Running validation checks...")
    all_issues = []
    total_stops = 0
    
    for journey in journeys:
        train_number = journey['train_number']
        stops = journey['journey_route']
        total_stops += len(stops)
        
        issues = validate_journey(train_number, stops)
        if issues:
            for issue in issues:
                all_issues.append({
                    'train_number': train_number,
                    'check': issue['check'],
                    'status': 'FAILED',
                    'description': issue['description']
                })
                
    # Save the reconstructed journeys
    journeys_path = os.path.join(config.PROCESSED_DATA_DIR, "journeys_scheduled.json")
    with open(journeys_path, 'w', encoding='utf-8') as f:
        json.dump(journeys, f, indent=2)
    print(f"Saved reconstructed journeys to {journeys_path}")
    
    # Generate quality report
    reports_dir = config.REPORTS_DIR
    os.makedirs(reports_dir, exist_ok=True)
    report_path = os.path.join(reports_dir, "journey_reconstruction_quality.csv")
    
    if all_issues:
        df_issues = pd.DataFrame(all_issues)
        # Summarize for the report format requested: CHECK, STATUS, COUNT, DESCRIPTION
        summary = df_issues.groupby(['check', 'status']).size().reset_index(name='count')
        # Add a sample description for the summary
        desc_map = df_issues.groupby('check')['description'].first().reset_index()
        summary = summary.merge(desc_map, on='check')
        summary = summary[['check', 'status', 'count', 'description']]
        
        summary.to_csv(report_path, index=False)
        print(f"Found {len(all_issues)} issues across {len(summary)} categories.")
        print(f"Quality report saved to {report_path}")
    else:
        # Save empty report with headers
        pd.DataFrame(columns=['check', 'status', 'count', 'description']).to_csv(report_path, index=False)
        print("No validation issues found!")
        print(f"Quality report saved to {report_path}")
        
    print("\nSummary:")
    print(f"- Total Journeys: {len(journeys)}")
    print(f"- Total Stops: {total_stops}")
    print("============================================================")

if __name__ == "__main__":
    main()
