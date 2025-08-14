from typing import List, Dict
from ..domain.entities.review_event import ReviewEvent
from ..domain.repositories.review_event_repository import ReviewEventRepository
from ..domain.value_objects.user_id import UserId

class InMemoryReviewEventRepository(ReviewEventRepository):
    def __init__(self):
        self._events: Dict[str, ReviewEvent] = {}
    
    def save(self, event: ReviewEvent) -> None:
        self._events[event.event_id] = event
    
    def find_by_user(self, user_id: UserId) -> List[ReviewEvent]:
        return [event for event in self._events.values() 
                if event.user_id.value == user_id.value]