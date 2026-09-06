import logging
from dotenv import load_dotenv
import os
import sys

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# Add project root to path (test_client.py is in src/live_api, so up 2 levels)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

from src.live_api.railradar_client import RailRadarClient

def main():
    # Load environment variables from .env if present
    load_dotenv()
    
    api_key = os.environ.get("RAILRADAR_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        print("Please set a valid RAILRADAR_API_KEY in the .env file or environment.")
        return

    print("Initializing RailRadarClient...")
    client = RailRadarClient()
    
    # Test train number
    test_train = "12919"
    print(f"Fetching live status for train {test_train}...")
    
    status = client.get_live_status(test_train)
    
    if status:
        print("\n--- Live Status Result ---")
        for k, v in status.items():
            print(f"{k}: {v}")
    else:
        print(f"\nFailed to retrieve status for train {test_train}.")

if __name__ == "__main__":
    main()
