from datetime import date, datetime
from typing import List, Dict
from pydantic import BaseModel, Field

class DailyUsage(BaseModel):
    user_id: str
    usage_date: date
    total_time_ms: int = Field(default=0)
    session_count: int = Field(default=0)

class Sticker(BaseModel):
    user_id: str
    sticker_date: date
    earned_at: datetime = Field(default_factory=datetime.now)

class StreakDay(BaseModel):
    user_id: str
    streak_date: date
    is_used: bool = Field(default=False)

class Badge(BaseModel):
    user_id: str
    badge_key: str
    earned_at: datetime = Field(default_factory=datetime.now)
    is_redeemed: bool = Field(default=False)

class WordCount(BaseModel):
    user_id: str
    word: str
    category: str
    count: int = Field(default=0)
    last_shown: datetime = Field(default_factory=datetime.now)