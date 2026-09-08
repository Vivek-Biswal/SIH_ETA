import pandas as pd
from typing import List, Dict

def time_to_seconds(time_str: str) -> int:
    """Converts a HH:MM:SS string to total seconds since midnight."""
    if not time_str or time_str == 'None':
        return -1
    try:
        parts = time_str.split(':')
        h = int(parts[0])
        m = int(parts[1])
        s = int(parts[2])
        return h * 3600 + m * 60 + s
    except (ValueError, IndexError):
        return -1

def reconstruct_journeys(schedules_df: pd.DataFrame) -> List[Dict]:
    """
    Reconstructs scheduled journeys from schedules DataFrame.
    """
    journeys = []
    
    # Group by train number
    grouped = schedules_df.groupby('train_number')
    
    for train_number, group in grouped:
        # Convert to list of dicts
        stops = group.to_dict('records')
        
        # Sort stops logically. Since schedules_clean.json does not have sequence,
        # we infer order by 'day' and the earliest available time at the stop.
        def stop_sort_key(stop):
            day = stop.get('day', 1.0)
            if pd.isna(day): day = 1.0
            
            arr = str(stop.get('arrival', ''))
            dep = str(stop.get('departure', ''))
            
            time_str = arr if arr and arr != 'None' else dep
            secs = time_to_seconds(time_str)
            return (day, secs)
            
        stops_sorted = sorted(stops, key=stop_sort_key)
        
        # Standardize the stop schema
        standardized_stops = []
        for i, stop in enumerate(stops_sorted):
            arr = str(stop.get('arrival', 'None'))
            dep = str(stop.get('departure', 'None'))
            
            standardized_stops.append({
                'station': stop.get('station_code'),
                'sequence': i + 1,
                'scheduled_arrival': None if arr == 'None' else arr,
                'scheduled_departure': None if dep == 'None' else dep,
                'day': stop.get('day')
                # 'distance' is omitted as it does not exist in the schedules_clean.json schema
            })
            
        journeys.append({
            'train_number': str(train_number),
            'journey_route': standardized_stops
        })
        
    return journeys
