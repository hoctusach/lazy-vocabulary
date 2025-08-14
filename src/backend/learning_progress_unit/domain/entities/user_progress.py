from dataclasses import dataclass
from datetime import datetime, timedelta
from ..value_objects.progress_id import ProgressId
from ..value_objects.user_id import UserId
from ..value_objects.srs_data import SRSData

@dataclass
class UserProgress:
    progress_id: ProgressId
    user_id: UserId
    word_id: str
    srs_data: SRSData
    total_reviews: int = 0
    correct_reviews: int = 0
    last_reviewed_at: datetime = None
    next_review_at: datetime = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.next_review_at is None:
            self.next_review_at = datetime.now() + timedelta(days=1)
    
    def is_due_for_review(self, date: datetime = None) -> bool:
        if date is None:
            date = datetime.now()
        return self.next_review_at <= date
    
    def get_accuracy_rate(self) -> float:
        if self.total_reviews == 0:
            return 0.0
        return self.correct_reviews / self.total_reviews