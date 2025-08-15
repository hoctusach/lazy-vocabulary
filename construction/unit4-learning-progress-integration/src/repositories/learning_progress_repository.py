import json
from local_storage_simulator import localStorage
from models.learning_progress import LearningProgress, LearningStatus
from typing import Dict, Optional
from datetime import datetime

class LearningProgressRepository:
    STORAGE_KEY = 'learningProgress'
    
    def __init__(self):
        self.storage = localStorage
    
    def get_all(self) -> Dict[str, LearningProgress]:
        stored = self.storage.get_item(self.STORAGE_KEY)
        progress_map = {}
        
        if stored:
            data = json.loads(stored) if isinstance(stored, str) else stored
            for key, value in data.items():
                # Data migration: add default values for new fields
                migrated_data = self._migrate_data(value)
                progress_map[key] = LearningProgress.from_dict(migrated_data)
        
        return progress_map
    
    def save_all(self, progress_map: Dict[str, LearningProgress]) -> None:
        data = {key: progress.to_dict() for key, progress in progress_map.items()}
        self.storage.set_item(self.STORAGE_KEY, json.dumps(data))
    
    def get(self, word_key: str) -> Optional[LearningProgress]:
        progress_map = self.get_all()
        return progress_map.get(word_key)
    
    def save(self, word_key: str, progress: LearningProgress) -> None:
        progress_map = self.get_all()
        progress_map[word_key] = progress
        self.save_all(progress_map)
    
    def _migrate_data(self, data: dict) -> dict:
        """Apply default values for backward compatibility"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        defaults = {
            'status': 'new',
            'next_review_date': today,
            'created_date': today,
            'retired_date': None
        }
        
        # Apply defaults for missing fields
        for key, default_value in defaults.items():
            if key not in data:
                if key == 'status':
                    data[key] = 'due' if data.get('is_learned', False) else default_value
                else:
                    data[key] = default_value
        
        return data