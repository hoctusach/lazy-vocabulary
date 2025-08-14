from typing import List, Optional, Dict
from datetime import datetime
from ..domain.entities.user_progress import UserProgress
from ..domain.repositories.user_progress_repository import UserProgressRepository
from ..domain.value_objects.user_id import UserId

class InMemoryUserProgressRepository(UserProgressRepository):
    def __init__(self):
        self._progress: Dict[str, UserProgress] = {}
    
    def save(self, progress: UserProgress) -> None:
        key = f"{progress.user_id.value}:{progress.word_id}"
        self._progress[key] = progress
    
    def find_by_user_and_word(self, user_id: UserId, word_id: str) -> Optional[UserProgress]:
        key = f"{user_id.value}:{word_id}"
        return self._progress.get(key)
    
    def find_by_user(self, user_id: UserId) -> List[UserProgress]:
        return [progress for progress in self._progress.values() 
                if progress.user_id.value == user_id.value]
    
    def find_due_for_review(self, user_id: UserId, date: datetime = None) -> List[UserProgress]:
        if date is None:
            date = datetime.now()
        
        user_progress = self.find_by_user(user_id)
        return [progress for progress in user_progress 
                if progress.is_due_for_review(date)]