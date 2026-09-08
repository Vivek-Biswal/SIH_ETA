import pandas as pd
import numpy as np

def analyze_joins(df_trains: pd.DataFrame, df_stations: pd.DataFrame, df_schedules: pd.DataFrame, df_da323: pd.DataFrame, df_delays: pd.DataFrame) -> pd.DataFrame:
    """Analyzes cross-dataset join compatibility."""
    rows = []
    
    # TRAINS <-> SCHEDULES
    if not df_trains.empty and not df_schedules.empty and 'train_number' in df_schedules.columns:
        train_nums = set(df_trains['number'].astype(str))
        sched_nums = set(df_schedules['train_number'].astype(str))
        
        sched_matched = len(sched_nums.intersection(train_nums))
        total_sched = len(sched_nums)
        match_pct = (sched_matched / total_sched * 100) if total_sched > 0 else 0
        
        rows.append({
            'relationship': 'TRAINS <-> SCHEDULES (by train_number)',
            'matched_records': sched_matched,
            'total_source_records': total_sched,
            'match_percentage': match_pct
        })
        
    # STATIONS <-> SCHEDULES
    if not df_stations.empty and not df_schedules.empty and 'station_code' in df_schedules.columns:
        station_codes = set(df_stations['code'].astype(str).str.upper())
        sched_codes = set(df_schedules['station_code'].astype(str).str.upper())
        
        sched_matched = len(sched_codes.intersection(station_codes))
        total_sched = len(sched_codes)
        match_pct = (sched_matched / total_sched * 100) if total_sched > 0 else 0
        
        rows.append({
            'relationship': 'STATIONS <-> SCHEDULES (by station_code)',
            'matched_records': sched_matched,
            'total_source_records': total_sched,
            'match_percentage': match_pct
        })
        
    # STATIONS <-> DA323
    if not df_stations.empty and not df_da323.empty and 'station_code' in df_da323.columns:
        station_codes = set(df_stations['code'].astype(str).str.upper())
        da323_codes = set(df_da323['station_code'].astype(str).str.upper())
        
        da323_matched = len(da323_codes.intersection(station_codes))
        total_da323 = len(da323_codes)
        match_pct = (da323_matched / total_da323 * 100) if total_da323 > 0 else 0
        
        rows.append({
            'relationship': 'STATIONS <-> DA323 (by station_code)',
            'matched_records': da323_matched,
            'total_source_records': total_da323,
            'match_percentage': match_pct
        })
        
    # TRAINS <-> LIVE DELAYS
    if not df_trains.empty and not df_delays.empty and 'train_number' in df_delays.columns:
        train_nums = set(df_trains['number'].astype(str))
        delay_nums = set(df_delays['train_number'].astype(str))
        
        delay_matched = len(delay_nums.intersection(train_nums))
        total_delay = len(delay_nums)
        match_pct = (delay_matched / total_delay * 100) if total_delay > 0 else 0
        
        rows.append({
            'relationship': 'TRAINS <-> LIVE_DELAYS (by train_number)',
            'matched_records': delay_matched,
            'total_source_records': total_delay,
            'match_percentage': match_pct
        })
        
    return pd.DataFrame(rows)
