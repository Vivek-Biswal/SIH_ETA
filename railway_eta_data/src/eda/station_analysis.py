import pandas as pd
import matplotlib.pyplot as plt
import os

def analyze_stations(df_stations: pd.DataFrame, figures_dir: str) -> dict:
    """Analyzes the stations dataset."""
    results = {}
    
    if df_stations.empty:
        return results
        
    results['total_stations'] = len(df_stations)
    
    if 'state' in df_stations.columns:
        state_counts = df_stations['state'].value_counts()
        results['states_count'] = len(state_counts)
        results['top_states'] = state_counts.head(5).to_dict()
        
    if 'zone' in df_stations.columns:
        zone_counts = df_stations['zone'].value_counts()
        results['zones_count'] = len(zone_counts)
        
        # Plot zones
        plt.figure(figsize=(12, 6))
        zone_counts.plot(kind='bar')
        plt.title('Station Distribution by Railway Zone')
        plt.xlabel('Zone')
        plt.ylabel('Number of Stations')
        plt.tight_layout()
        plt.savefig(os.path.join(figures_dir, 'station_zone_dist.png'))
        plt.close()
        
    if 'lat' in df_stations.columns and 'lng' in df_stations.columns:
        lat_missing = df_stations['lat'].isnull().sum()
        lng_missing = df_stations['lng'].isnull().sum()
        results['missing_coordinates'] = max(lat_missing, lng_missing)
        
    return results
