from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional
from enum import Enum

class DifficultyLevel(Enum):
    EASY = 1
    MEDIUM = 2
    HARD = 3

@dataclass
class WordProgress:
    word_id: str
    correct_count: int = 0
    incorrect_count: int = 0
    last_reviewed: Optional[datetime] = None
    difficulty_level: DifficultyLevel = DifficultyLevel.MEDIUM
    next_review_date: Optional[datetime] = None
    
    @property
    def success_rate(self) -> float:
        total = self.correct_count + self.incorrect_count
        return self.correct_count / total if total > 0 else 0.0
    
    @property
    def total_reviews(self) -> int:
        return self.correct_count + self.incorrect_count

@dataclass
class LearningSession:
    session_id: str
    start_time: datetime
    words_reviewed: Dict[str, bool]  # word_id -> correct/incorrect
    
    @property
    def total_words(self) -> int:
        return len(self.words_reviewed)
    
    @property
    def correct_words(self) -> int:
        return sum(1 for correct in self.words_reviewed.values() if correct)