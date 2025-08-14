from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from ..entities.user_progress import UserProgress
from ..value_objects.user_id import UserId

class UserProgressRepository(ABC):
    @abstractmethod
    def save(self, progress: UserProgress) -> None:
        pass
    
    @abstractmethod
    def find_by_user_and_word(self, user_id: UserId, word_id: str) -> Optional[UserProgress]:
        pass
    
    @abstractmethod
    def find_by_user(self, user_id: UserId) -> List[UserProgress]:
        pass
    
    @abstractmethod
    def find_due_for_review(self, user_id: UserId, date: datetime = None) -> List[UserProgress]:
        pass