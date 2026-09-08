import pytest
import pandas as pd
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.eda.overview import dataset_overview
from src.eda.cross_dataset_analysis import analyze_joins

def test_dataset_overview():
    df1 = pd.DataFrame({'a': [1, 2], 'b': [3, 4]})
    df2 = pd.DataFrame()
    
    datasets = {
        'test_df': (df1, 'STATIC'),
        'empty_df': (df2, 'STATIC')
    }
    
    overview = dataset_overview(datasets)
    assert len(overview) == 1
    assert overview.iloc[0]['dataset_name'] == 'test_df'
    assert overview.iloc[0]['record_count'] == 2

def test_analyze_joins():
    df_trains = pd.DataFrame({'number': ['123', '456']})
    df_schedules = pd.DataFrame({'train_number': ['123', '789'], 'station_code': ['ABC', 'DEF']})
    df_stations = pd.DataFrame({'code': ['ABC', 'XYZ']})
    df_da323 = pd.DataFrame({'station_code': ['ABC', 'DEF']})
    df_live = pd.DataFrame({'train_number': ['456']})
    
    joins = analyze_joins(df_trains, df_stations, df_schedules, df_da323, df_live)
    
    # 4 relationships expected based on the data provided
    assert len(joins) == 4
    
    trains_sched = joins[joins['relationship'] == 'TRAINS <-> SCHEDULES (by train_number)'].iloc[0]
    assert trains_sched['matched_records'] == 1 # '123'
    assert trains_sched['total_source_records'] == 2 # '123', '789'
    assert trains_sched['match_percentage'] == 50.0
    
    trains_live = joins[joins['relationship'] == 'TRAINS <-> LIVE_DELAYS (by train_number)'].iloc[0]
    assert trains_live['matched_records'] == 1 # '456'
    assert trains_live['match_percentage'] == 100.0
