import os
import sys
import glob
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cleaning.decision_log import DecisionLog

def clean_historical_delay(input_dir, output_csv, log):
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    
    files = glob.glob(os.path.join(input_dir, '*.csv'))
    
    all_records = []
    
    for f in files:
        train_number = os.path.basename(f).replace('.csv', '')
        try:
            df = pd.read_csv(f)
        except Exception as e:
            log.add(
                record_id=f"file#{os.path.basename(f)}",
                source="historical_delay",
                issue_type="FILE_READ_ERROR",
                decision="EXCLUDE",
                reason=f"Failed to read CSV: {e}"
            )
            continue
            
        for idx, row in df.iterrows():
            record_id = f"hist#{train_number}#{idx}"
            
            # Extract fields
            station_code = str(row.get('Station', '')).strip()
            station_name = str(row.get('Station_Name', '')).strip()
            
            # Check station
            if not station_code or station_code == 'nan':
                log.add(record_id, "historical_delay", "MISSING_STATION", "EXCLUDE", "Station code is missing", str(row.get('Station')))
                continue
                
            # Function to parse numeric percentages safely
            def parse_numeric(val):
                if pd.isna(val):
                    return None
                val_str = str(val).strip()
                if val_str == '-' or val_str == '':
                    return None
                try:
                    return float(val_str)
                except ValueError:
                    return None

            avg_delay = parse_numeric(row.get('Average_Delay(min)'))
            pct_right = parse_numeric(row.get("Right Time (0-15 min's)"))
            pct_slight = parse_numeric(row.get("Slight Delay (15-60 min's)"))
            pct_sig = parse_numeric(row.get("Significant Delay (>1 Hour)"))
            pct_canc = parse_numeric(row.get("Cancelled/Unknown"))
            
            if avg_delay is None:
                log.add(record_id, "historical_delay", "MISSING_DELAY", "EXCLUDE", "Average delay is missing/invalid", str(row.get('Average_Delay(min)')))
                continue
                
            # Clean record
            clean_rec = {
                'train_number': train_number,
                'station_code': station_code,
                'station_name': station_name,
                'avg_delay_minutes': avg_delay,
                'percent_right_time': pct_right if pct_right is not None else 0.0,
                'percent_slight_delay': pct_slight if pct_slight is not None else 0.0,
                'percent_significant_delay': pct_sig if pct_sig is not None else 0.0,
                'percent_cancelled': pct_canc if pct_canc is not None else 0.0,
            }
            all_records.append(clean_rec)
            
    # Remove duplicates
    final_df = pd.DataFrame(all_records)
    if not final_df.empty:
        before_count = len(final_df)
        final_df.drop_duplicates(inplace=True)
        after_count = len(final_df)
        if before_count > after_count:
            log.add(
                "global_duplicate_check",
                "historical_delay",
                "DUPLICATE_RECORDS",
                "EXCLUDE",
                f"Removed {before_count - after_count} exact duplicates"
            )
        
        final_df.to_csv(output_csv, index=False)
        print(f"Cleaned data saved to {output_csv} ({len(final_df)} records)")
    else:
        print("No valid records found!")

