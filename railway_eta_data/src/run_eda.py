import os
import sys
import json
import pandas as pd
from config import PROCESSED_DATA_DIR, REPORTS_DIR

# Ensure we can import from src
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from eda import (
    dataset_overview,
    analyze_trains,
    analyze_stations,
    analyze_schedules,
    analyze_routes,
    analyze_historical_delays,
    analyze_live_delays,
    analyze_joins
)

EDA_REPORTS_DIR = os.path.join(REPORTS_DIR, 'eda')
FIGURES_DIR = os.path.join(EDA_REPORTS_DIR, 'figures')

os.makedirs(EDA_REPORTS_DIR, exist_ok=True)
os.makedirs(FIGURES_DIR, exist_ok=True)

def load_data():
    print("Loading datasets...")
    
    # Static Data
    trains_path = os.path.join(PROCESSED_DATA_DIR, 'trains_clean.json')
    stations_path = os.path.join(PROCESSED_DATA_DIR, 'stations_clean.json')
    schedules_path = os.path.join(PROCESSED_DATA_DIR, 'schedules_clean.json')
    journeys_path = os.path.join(PROCESSED_DATA_DIR, 'journeys_scheduled.json')
    
    # Delay Data
    da323_path = os.path.join(PROCESSED_DATA_DIR, 'public_historical_delay_clean.csv')
    live_path = os.path.join(PROCESSED_DATA_DIR, 'delays_clean.json')
    
    # Load into Pandas safely
    def load_json(path):
        if not os.path.exists(path): return pd.DataFrame()
        try: return pd.read_json(path)
        except: return pd.DataFrame()
        
    def load_csv(path):
        if not os.path.exists(path): return pd.DataFrame()
        try: return pd.read_csv(path)
        except: return pd.DataFrame()
        
    df_trains = load_json(trains_path)
    df_stations = load_json(stations_path)
    df_schedules = load_json(schedules_path)
    df_da323 = load_csv(da323_path)
    df_live = load_json(live_path)
    
    # Load journeys strictly as a list of dicts, as they contain nested structures
    journeys_list = []
    if os.path.exists(journeys_path):
        with open(journeys_path, 'r', encoding='utf-8') as f:
            journeys_list = json.load(f)
            
    df_journeys = pd.DataFrame(journeys_list)
            
    datasets = {
        'trains': (df_trains, 'STATIC'),
        'stations': (df_stations, 'STATIC'),
        'schedules': (df_schedules, 'STATIC'),
        'journeys_scheduled': (df_journeys, 'STATIC'),
        'da323_historical': (df_da323, 'HISTORICAL_AGGREGATED'),
        'railpull_live': (df_live, 'LIVE_SNAPSHOT')
    }
    
    return datasets, journeys_list

def main():
    print("============================================================")
    print("RUNNING EXPLORATORY DATA ANALYSIS")
    print("============================================================")
    
    datasets, journeys_list = load_data()
    
    # 1. Overview
    print("Generating Dataset Overview...")
    df_overview = dataset_overview(datasets)
    df_overview.to_csv(os.path.join(EDA_REPORTS_DIR, 'dataset_overview.csv'), index=False)
    
    df_trains = datasets['trains'][0]
    df_stations = datasets['stations'][0]
    df_schedules = datasets['schedules'][0]
    df_da323 = datasets['da323_historical'][0]
    df_live = datasets['railpull_live'][0]
    df_journeys = datasets['journeys_scheduled'][0]
    
    # 2. Train Analysis
    print("Analyzing Trains...")
    train_res = analyze_trains(df_trains, FIGURES_DIR)
    
    # 3. Station Analysis
    print("Analyzing Stations...")
    station_res = analyze_stations(df_stations, FIGURES_DIR)
    
    # 4. Schedule Analysis
    print("Analyzing Schedules...")
    sched_res = analyze_schedules(df_schedules, df_journeys, FIGURES_DIR)
    
    # 5. Route Analysis
    print("Analyzing Routes...")
    route_res = analyze_routes(journeys_list, FIGURES_DIR)
    
    # 6. Delay Analysis
    print("Analyzing Historical Aggregated Delays...")
    da323_res = analyze_historical_delays(df_da323, FIGURES_DIR)
    
    print("Analyzing Live Delays...")
    live_res = analyze_live_delays(df_live, FIGURES_DIR)
    
    # 7. Cross-Dataset Join Analysis
    print("Analyzing Joins...")
    df_joins = analyze_joins(df_trains, df_stations, df_schedules, df_da323, df_live)
    df_joins.to_csv(os.path.join(EDA_REPORTS_DIR, 'join_analysis.csv'), index=False)
    
    print("============================================================")
    print("EDA COMPLETE")
    print(f"Results saved to {EDA_REPORTS_DIR}")
    print("============================================================")

if __name__ == "__main__":
    main()
