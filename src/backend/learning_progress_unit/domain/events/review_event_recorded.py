from dataclasses import dataclass
from datetime import datetime
from ..value_objects.user_id import UserId
from ..value_objects.srs_data import ReviewResponse

@dataclass
class ReviewEventRecorded:
    user_id: UserId
    word_id: str
    response: ReviewResponse
    response_time: int  # milliseconds
    occurred_at: datetime