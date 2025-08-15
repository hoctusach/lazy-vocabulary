"""
Serverless localStorage simulation using in-memory dictionaries
Matches browser localStorage behavior exactly
"""
import json
from typing import Dict, Optional, Any

class LocalStorageSimulator:
    """Simulates browser localStorage using in-memory dictionary"""
    
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
        value = self.get_item(key)
        if value is None:
            return default
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    
    def set_json(self, key: str, value: Any):
        self.set_item(key, json.dumps(value))

class SessionStorageSimulator:
    """Simulates browser sessionStorage using in-memory dictionary"""
    
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
        value = self.get_item(key)
        if value is None:
            return default
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    
    def set_json(self, key: str, value: Any):
        self.set_item(key, json.dumps(value))

# Global instances (serverless, in-memory only)
local_storage = LocalStorageSimulator()
session_storage = SessionStorageSimulator()