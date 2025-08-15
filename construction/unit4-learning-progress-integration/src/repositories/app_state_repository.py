import json
from local_storage_simulator import localStorage
from models.app_lifecycle_state import AppLifecycleState
from typing import Optional

class AppStateRepository:
    LAST_INIT_DATE_KEY = 'lastAppInitDate'
    SEVERITY_KEY = 'userPreferredSeverity'
    
    def __init__(self):
        self.storage = localStorage
    
    def get_last_init_date(self) -> Optional[str]:
        return self.storage.get_item(self.LAST_INIT_DATE_KEY)
    
    def save_last_init_date(self, date: str) -> None:
        self.storage.set_item(self.LAST_INIT_DATE_KEY, date)
    
    def get_preferred_severity(self) -> str:
        return self.storage.get_item(self.SEVERITY_KEY) or 'moderate'
    
    def save_preferred_severity(self, severity: str) -> None:
        self.storage.set_item(self.SEVERITY_KEY, severity)