"""
Learning Progress Repository - localStorage simulation
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from storage_simulator import local_storage
from models.learning_progress import EnhancedLearningProgress
from typing import Dict, Optional

class LearningProgressRepository:
    """Repository for learning progress using localStorage simulation"""
    
    STORAGE_KEY = 'learningProgress'
    
    def get_progress(self, word_key: str) -> Optional[EnhancedLearningProgress]:
        """Get progress for a specific word"""
        all_progress = local_storage.get_json(self.STORAGE_KEY, {})
        if word_key not in all_progress:
            return None
        return EnhancedLearningProgress.from_dict(word_key, all_progress[word_key])
    
    def save_progress(self, word_key: str, progress: EnhancedLearningProgress):
        """Save progress for a specific word"""
        all_progress = local_storage.get_json(self.STORAGE_KEY, {})
        all_progress[word_key] = progress.to_dict()
        local_storage.set_json(self.STORAGE_KEY, all_progress)
    
    def get_all_progress(self) -> Dict[str, EnhancedLearningProgress]:
        """Get all learning progress"""
        all_progress = local_storage.get_json(self.STORAGE_KEY, {})
        return {
            word_key: EnhancedLearningProgress.from_dict(word_key, data)
            for word_key, data in all_progress.items()
        }
    
    def migrate_existing_data(self):
        """Migrate existing data to include new fields with defaults"""
        all_progress = local_storage.get_json(self.STORAGE_KEY, {})
        
        for word_key, progress in all_progress.items():
            # Add missing timing fields
            if 'exposuresToday' not in progress:
                progress['exposuresToday'] = 0
            if 'lastExposureTime' not in progress:
                progress['lastExposureTime'] = ''
            if 'nextAllowedTime' not in progress:
                progress['nextAllowedTime'] = ''
            
            # Add missing FR3 fields
            if 'reviewCount' not in progress:
                progress['reviewCount'] = 0
            if 'nextReviewDate' not in progress:
                progress['nextReviewDate'] = None
            if 'lastPlayedDate' not in progress:
                progress['lastPlayedDate'] = None
            if 'isMastered' not in progress:
                progress['isMastered'] = False
            if 'retired' not in progress:
                progress['retired'] = False
        
        local_storage.set_json(self.STORAGE_KEY, all_progress)