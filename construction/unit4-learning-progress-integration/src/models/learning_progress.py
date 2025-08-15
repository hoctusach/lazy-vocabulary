from dataclasses import dataclass
from enum import Enum
from typing import Optional

class LearningStatus(Enum):
    NEW = "new"
    DUE = "due"
    NOT_DUE = "not_due"
    RETIRED = "retired"

@dataclass
class LearningProgress:
    word: str
    category: str
    is_learned: bool
    review_count: int
    last_played_date: str
    status: LearningStatus
    next_review_date: str
    created_date: str
    type: Optional[str] = None
    retired_date: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            'word': self.word,
            'category': self.category,
            'is_learned': self.is_learned,
            'review_count': self.review_count,
            'last_played_date': self.last_played_date,
            'status': self.status.value,
            'next_review_date': self.next_review_date,
            'created_date': self.created_date,
            'type': self.type,
            'retired_date': self.retired_date
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'LearningProgress':
        return cls(
            word=data['word'],
            category=data['category'],
            is_learned=data['is_learned'],
            review_count=data['review_count'],
            last_played_date=data['last_played_date'],
            status=LearningStatus(data['status']),
            next_review_date=data['next_review_date'],
            created_date=data['created_date'],
            type=data.get('type'),
            retired_date=data.get('retired_date')
        )

@dataclass
class DailySelection:
    new_words: list[LearningProgress]
    review_words: list[LearningProgress]
    total_count: int