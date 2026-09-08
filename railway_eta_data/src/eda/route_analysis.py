import pandas as pd
import matplotlib.pyplot as plt
import os

def analyze_routes(journeys_list: list, figures_dir: str) -> dict:
    """Analyzes the reconstructed journeys structure."""
    results = {}
    
    if not journeys_list:
        return results
        
    stop_counts = [len(j.get('journey_route', [])) for j in journeys_list]
    df_stops = pd.Series(stop_counts)
    
    results['total_journeys'] = len(journeys_list)
    results['avg_stops_per_journey'] = df_stops.mean()
    results['max_stops_per_journey'] = df_stops.max()
    results['min_stops_per_journey'] = df_stops.min()
    
    # Plot route stops
    plt.figure(figsize=(10, 6))
    df_stops.plot(kind='hist', bins=50)
    plt.title('Distribution of Stops per Journey Route')
    plt.xlabel('Number of Stops')
    plt.ylabel('Frequency')
    plt.tight_layout()
    plt.savefig(os.path.join(figures_dir, 'route_stop_count_dist.png'))
    plt.close()
    
    return results
