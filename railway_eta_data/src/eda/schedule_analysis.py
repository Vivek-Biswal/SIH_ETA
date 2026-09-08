import pandas as pd
import matplotlib.pyplot as plt
import os

def analyze_schedules(df_schedules: pd.DataFrame, df_journeys: pd.DataFrame, figures_dir: str) -> dict:
    """Analyzes schedule and time patterns."""
    results = {}
    
    # Process departure hours from schedules
    if not df_schedules.empty and 'departure' in df_schedules.columns:
        # Extract hour from HH:MM:SS format safely
        def get_hour(time_str):
            if pd.isna(time_str) or time_str == 'None': return None
            try:
                return int(str(time_str).split(':')[0])
            except:
                return None
                
        df_schedules['dep_hour'] = df_schedules['departure'].apply(get_hour)
        hour_counts = df_schedules['dep_hour'].value_counts().sort_index()
        
        # Plot departure hours
        plt.figure(figsize=(10, 6))
        hour_counts.plot(kind='bar')
        plt.title('Distribution of Scheduled Departure Hours')
        plt.xlabel('Hour of Day (0-23)')
        plt.ylabel('Number of Departures')
        plt.tight_layout()
        plt.savefig(os.path.join(figures_dir, 'departure_hour_dist.png'))
        plt.close()
        
        results['peak_departure_hour'] = hour_counts.idxmax() if not hour_counts.empty else None
        
    if not df_schedules.empty and 'day' in df_schedules.columns:
        results['multi_day_stops'] = (pd.to_numeric(df_schedules['day'], errors='coerce') > 1).sum()
        
    return results
