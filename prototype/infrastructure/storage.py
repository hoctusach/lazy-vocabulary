import json
from typing import Any, Dict, Optional

class LocalStorageSimulator:
    """Simulates localStorage behavior using in-memory dictionaries"""
    
    def __init__(self):
        self._storage: Dict[str, str] = {}
    
    def get_item(self, key: str) -> Optional[str]:
        return self._storage.get(key)
    
    def set_item(self, key: str, value: str):
        self._storage[key] = value
    
    def remove_item(self, key: str):
        self._storage.pop(key, None)
    
    def clear(self):
        self._storage.clear()
    
    def get_json(self, key: str, default=None) -> Any:
        """Get and parse JSON value"""
        value = self.get_item(key)
        if value is None:
            return default
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    
    def set_json(self, key: str, value: Any):
        """Serialize and store JSON value"""
        self.set_item(key, json.dumps(value))

# Global storage instance
local_storage = LocalStorageSimulator()