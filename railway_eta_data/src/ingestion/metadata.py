import csv
import os
from dataclasses import dataclass
from typing import List

@dataclass
class DatasetMetadata:
    source_name: str
    source_url: str
    file_name: str
    file_format: str
    ingestion_date: str
    record_count: int
    
    def to_dict(self):
        return {
            'source_name': self.source_name,
            'source_url': self.source_url,
            'file_name': self.file_name,
            'file_format': self.file_format,
            'ingestion_date': self.ingestion_date,
            'record_count': self.record_count
        }

def save_metadata_summary(metadata_list: List[DatasetMetadata], output_path: str):
    """Saves a list of metadata objects to a CSV summary file."""
    if not metadata_list:
        return
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    keys = metadata_list[0].to_dict().keys()
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for meta in metadata_list:
            writer.writerow(meta.to_dict())
