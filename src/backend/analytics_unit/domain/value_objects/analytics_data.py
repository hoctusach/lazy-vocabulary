from dataclasses import dataclass
from datetime import date
from enum import Enum

class PeriodType(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

@dataclass(frozen=True)
class TimePeriod:
    start_date: date
    end_date: date
    period_type: PeriodType
    
    def validate(self) -> bool:
        return self.start_date <= self.end_date

@dataclass(frozen=True)
class UserActivityData:
    daily_active_users: int
    weekly_active_users: int
    monthly_active_users: int
    new_users: int
    returning_users: int

@dataclass(frozen=True)
class ReviewMetrics:
    total_reviews: int
    unique_users: int
    average_response_time: int  # milliseconds
    
    def get_review_frequency(self) -> float:
        return self.total_reviews / max(1, self.unique_users)

@dataclass(frozen=True)
class AccuracyMetrics:
    correct_reviews: int
    total_reviews: int
    
    def calculate_accuracy_rate(self) -> float:
        if self.total_reviews == 0:
            return 0.0
        return self.correct_reviews / self.total_reviews
    
    def get_difficulty_score(self) -> float:
        return 1.0 - self.calculate_accuracy_rate()