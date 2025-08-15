import json
import os
from typing import Any, Optional

class LocalStorageSimulator:
    """Simulates browser localStorage using JSON files"""
    
    def __init__(self, storage_dir: str = "storage"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
    
    def _get_file_path(self, key: str) -> str:
        return os.path.join(self.storage_dir, f"{key}.json")
    
    def get_item(self, key: str) -> Optional[str]:
        file_path = self._get_file_path(key)
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                return json.load(f)
        return None
    
    def set_item(self, key: str, value: str) -> None:
        file_path = self._get_file_path(key)
        with open(file_path, 'w') as f:
            json.dump(value, f)
    
    def remove_item(self, key: str) -> None:
        file_path = self._get_file_path(key)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    def clear(self) -> None:
        for file in os.listdir(self.storage_dir):
            if file.endswith('.json'):
                os.remove(os.path.join(self.storage_dir, file))

# Global instance
localStorage = LocalStorageSimulator()