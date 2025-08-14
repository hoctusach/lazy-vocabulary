from abc import ABC, abstractmethod
from typing import List
from ..entities.review_event import ReviewEvent
from ..value_objects.user_id import UserId

class ReviewEventRepository(ABC):
    @abstractmethod
    def save(self, event: ReviewEvent) -> None:
        pass
    
    @abstractmethod
    def find_by_user(self, user_id: UserId) -> List[ReviewEvent]:
        pass