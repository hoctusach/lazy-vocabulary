"""
Enhanced Learning Progress domain model
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class EnhancedLearningProgress:
    """Core aggregate root for learning progress"""
    
    # Existing fields
    word: str
    category: str = ""
    is_learned: bool = False
    status: str = "new"  # 'due' | 'not_due' | 'new'
    created_date: str = field(default_factory=lambda: datetime.now().isoformat().split('T')[0])
    
    # Timing fields
    exposures_today: int = 0
    last_exposure_time: str = ""
    next_allowed_time: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # FR3 Review scheduling fields
    review_count: int = 0
    next_review_date: Optional[str] = None
    last_played_date: Optional[str] = None
    is_mastered: bool = False
    retired: bool = False
    
    def to_dict(self) -> dict:
        """Convert to dictionary for localStorage storage"""
        return {
            'word': self.word,
            'category': self.category,
            'isLearned': self.is_learned,
            'status': self.status,
            'createdDate': self.created_date,
            'exposuresToday': self.exposures_today,
            'lastExposureTime': self.last_exposure_time,
            'nextAllowedTime': self.next_allowed_time,
            'reviewCount': self.review_count,
            'nextReviewDate': self.next_review_date,
            'lastPlayedDate': self.last_played_date,
            'isMastered': self.is_mastered,
            'retired': self.retired
        }
    
    @classmethod
    def from_dict(cls, word_key: str, data: dict) -> 'EnhancedLearningProgress':
        """Create from dictionary (localStorage format)"""
        return cls(
            word=word_key,
            category=data.get('category', ''),
            is_learned=data.get('isLearned', False),
            status=data.get('status', 'new'),
            created_date=data.get('createdDate', datetime.now().isoformat().split('T')[0]),
            exposures_today=data.get('exposuresToday', 0),
            last_exposure_time=data.get('lastExposureTime', ''),
            next_allowed_time=data.get('nextAllowedTime', datetime.now().isoformat()),
            review_count=data.get('reviewCount', 0),
            next_review_date=data.get('nextReviewDate'),
            last_played_date=data.get('lastPlayedDate'),
            is_mastered=data.get('isMastered', False),
            retired=data.get('retired', False)
        )