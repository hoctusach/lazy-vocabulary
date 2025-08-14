from dataclasses import dataclass
from datetime import datetime
from ..value_objects.user_id import UserId
from ..value_objects.srs_data import ReviewResponse

@dataclass
class ReviewEvent:
    event_id: str
    user_id: UserId
    word_id: str
    response: ReviewResponse
    response_time: int  # milliseconds
    occurred_at: datetime = None
    
    def __post_init__(self):
        if self.occurred_at is None:
            self.occurred_at = datetime.now()