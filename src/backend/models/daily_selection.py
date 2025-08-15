from datetime import date
from typing import List
from enum import Enum
from pydantic import BaseModel, Field

class SeverityLevel(str, Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    INTENSE = "intense"

class CategoryWeights(BaseModel):
    phrasal_verbs: float = 0.13
    idioms: float = 0.07
    topic_vocabulary: float = 0.44
    grammar: float = 0.03
    phrases_collocations: float = 0.05
    word_formation: float = 0.06

class DailySelectionWord(BaseModel):
    word: str
    category: str
    reviewCount: int = 0

class DailySelection(BaseModel):
    user_id: str
    selection_date: date = Field(default_factory=date.today)
    newWords: List[DailySelectionWord] = Field(default_factory=list)
    reviewWords: List[DailySelectionWord] = Field(default_factory=list)
    totalCount: int = 0
    severity_level: SeverityLevel = SeverityLevel.MODERATE

class DailySelectionRequest(BaseModel):
    user_id: str
    severity: SeverityLevel = SeverityLevel.MODERATE