from dataclasses import dataclass
from datetime import datetime

@dataclass(frozen=True)
class LocalProgressData:
    word_id: str
    review_count: int
    correct_count: int
    last_reviewed_at: datetime
    srs_interval: int
    ease_factor: float
    
    def validate(self) -> bool:
        return (
            self.review_count >= 0 and
            self.correct_count >= 0 and
            self.correct_count <= self.review_count and
            self.srs_interval >= 0 and
            self.ease_factor > 0
        )