import pandas as pd
import matplotlib.pyplot as plt
import os

def analyze_historical_delays(df_da323: pd.DataFrame, figures_dir: str) -> dict:
    """Analyzes historical aggregated delay data (DA323)."""
    results = {}
    
    if df_da323.empty:
        return results
        
    results['total_records'] = len(df_da323)
    
    # DA323 delay distributions
    if 'avg_delay_minutes' in df_da323.columns:
        avg_delay = pd.to_numeric(df_da323['avg_delay_minutes'], errors='coerce').dropna()
        results['historical_mean_avg_delay'] = avg_delay.mean()
        results['historical_max_avg_delay'] = avg_delay.max()
        
        plt.figure(figsize=(10, 6))
        avg_delay[avg_delay < 300].plot(kind='hist', bins=50) # Cap at 5 hours for better visualization
        plt.title('Distribution of Historical Average Delay (DA323)')
        plt.xlabel('Average Delay (Minutes)')
        plt.ylabel('Frequency')
        plt.tight_layout()
        plt.savefig(os.path.join(figures_dir, 'historical_avg_delay_dist.png'))
        plt.close()
        
    return results

def analyze_live_delays(df_delays: pd.DataFrame, figures_dir: str) -> dict:
    """Analyzes the live snapshot delay data (Railpull)."""
    results = {}
    
    if df_delays.empty:
        return results
        
    results['total_snapshot_records'] = len(df_delays)
    
    if 'delay' in df_delays.columns:
        delay = pd.to_numeric(df_delays['delay'], errors='coerce').dropna()
        results['snapshot_mean_delay'] = delay.mean()
        results['snapshot_max_delay'] = delay.max()
        
    return results
