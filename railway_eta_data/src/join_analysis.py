import os
import pandas as pd

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    processed_dir = os.path.join(base_dir, 'data', 'processed')
    
    # Load Data
    hist_df = pd.read_csv(os.path.join(processed_dir, 'public_historical_delay_clean.csv'), dtype={'train_number': str})
    stations_df = pd.read_csv(os.path.join(processed_dir, 'stations_clean.csv'))
    trains_df = pd.read_csv(os.path.join(processed_dir, 'trains_clean.csv'), dtype={'number': str})
    
    # Clean up datatypes for joining
    hist_df['train_number'] = hist_df['train_number'].astype(str).str.strip()
    hist_df['station_code'] = hist_df['station_code'].astype(str).str.strip().str.upper()
    
    stations_df['code'] = stations_df['code'].astype(str).str.strip().str.upper()
    trains_df['number'] = trains_df['number'].astype(str).str.strip()
    
    # Analysis 1: Train Number Match
    unique_hist_trains = hist_df['train_number'].unique()
    train_matches = sum(t in trains_df['number'].values for t in unique_hist_trains)
    train_match_rate = train_matches / len(unique_hist_trains) if len(unique_hist_trains) > 0 else 0
    
    # Analysis 2: Station Code Match
    unique_hist_stations = hist_df['station_code'].unique()
    station_matches = sum(s in stations_df['code'].values for s in unique_hist_stations)
    station_match_rate = station_matches / len(unique_hist_stations) if len(unique_hist_stations) > 0 else 0
    
    print(f"--- Join Analysis ---")
    print(f"Train Match: {train_matches}/{len(unique_hist_trains)} ({train_match_rate:.2%})")
    print(f"Station Match: {station_matches}/{len(unique_hist_stations)} ({station_match_rate:.2%})")
    
    # Check what didn't match (for reporting)
    unmatched_trains = [t for t in unique_hist_trains if t not in trains_df['number'].values]
    unmatched_stations = [s for s in unique_hist_stations if s not in stations_df['code'].values]
    
    print(f"Sample unmatched trains: {unmatched_trains[:5]}")
    print(f"Sample unmatched stations: {unmatched_stations[:5]}")

if __name__ == "__main__":
    main()
