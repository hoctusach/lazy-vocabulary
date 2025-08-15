from datetime import date
from enum import Enum
from pydantic import BaseModel, Field

class LearningStatus(str, Enum):
    NEW = "new"
    DUE = "due"
    LEARNED = "learned"
    RETIRED = "retired"

class LearningProgress(BaseModel):
    user_id: str
    word: str
    category: str = "topic vocab"
    is_learned: bool = False
    review_count: int = 0
    last_played_date: date = Field(default_factory=date.today)
    next_review_date: date = Field(default_factory=date.today)
    status: LearningStatus = LearningStatus.NEW
    retired_date: date = None

class LearningProgressUpdate(BaseModel):
    user_id: str
    word: str

class LearningProgressStats(BaseModel):
    total: int = 0
    learned: int = 0
    new: int = 0
    due: int = 0
    retired: int = 0