import pandas as pd
import matplotlib.pyplot as plt
import os

def analyze_trains(df_trains: pd.DataFrame, figures_dir: str) -> dict:
    """Analyzes the trains dataset."""
    results = {}
    
    if df_trains.empty:
        return results
        
    results['unique_trains'] = df_trains['number'].nunique()
    
    # Train types
    if 'type' in df_trains.columns:
        type_counts = df_trains['type'].value_counts()
        results['train_types'] = type_counts.to_dict()
        
        # Plot
        plt.figure(figsize=(10, 6))
        type_counts.head(10).plot(kind='bar')
        plt.title('Top 10 Train Types')
        plt.xlabel('Train Type')
        plt.ylabel('Count')
        plt.tight_layout()
        plt.savefig(os.path.join(figures_dir, 'train_types_distribution.png'))
        plt.close()
        
    # Distance
    if 'distance' in df_trains.columns:
        dist = pd.to_numeric(df_trains['distance'], errors='coerce').dropna()
        results['distance_mean'] = dist.mean()
        results['distance_median'] = dist.median()
        results['distance_min'] = dist.min()
        results['distance_max'] = dist.max()
        
    # Duration
    # Convert duration_h and duration_m to total hours
    if 'duration_h' in df_trains.columns and 'duration_m' in df_trains.columns:
        dur_h = pd.to_numeric(df_trains['duration_h'], errors='coerce').fillna(0)
        dur_m = pd.to_numeric(df_trains['duration_m'], errors='coerce').fillna(0)
        total_dur = dur_h + (dur_m / 60)
        total_dur = total_dur[total_dur > 0] # Filter invalid
        
        if not total_dur.empty:
            results['duration_hours_mean'] = total_dur.mean()
            results['duration_hours_max'] = total_dur.max()
            
            # Plot duration
            plt.figure(figsize=(10, 6))
            total_dur.plot(kind='hist', bins=50)
            plt.title('Distribution of Scheduled Journey Duration (Hours)')
            plt.xlabel('Hours')
            plt.ylabel('Frequency')
            plt.tight_layout()
            plt.savefig(os.path.join(figures_dir, 'journey_duration_dist.png'))
            plt.close()
            
    return results
