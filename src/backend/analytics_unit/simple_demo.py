#!/usr/bin/env python3
"""
Simple demo script for Analytics Unit
Tests analytics functionality without complex imports
"""

import uuid
from datetime import datetime, date
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from enum import Enum

# Value Objects
class PeriodType(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

@dataclass(frozen=True)
class TimePeriod:
    start_date: date
    end_date: date
    period_type: PeriodType

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
    average_response_time: int
    
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

# Identifiers
@dataclass(frozen=True)
class AnalyticsId:
    value: str
    
    @classmethod
    def generate(cls):
        return cls(str(uuid.uuid4()))

@dataclass(frozen=True)
class MetricsId:
    value: str
    
    @classmethod
    def generate(cls):
        return cls(str(uuid.uuid4()))

# Entities
@dataclass
class VocabularyAnalytics:
    analytics_id: AnalyticsId
    word_id: str
    category_id: str
    review_metrics: ReviewMetrics
    accuracy_metrics: AccuracyMetrics
    popularity_score: float = 0.0
    last_updated_at: datetime = None
    
    def __post_init__(self):
        if self.last_updated_at is None:
            self.last_updated_at = datetime.now()
    
    def update_from_review(self, is_correct: bool, response_time: int):
        new_total = self.review_metrics.total_reviews + 1
        new_correct = self.accuracy_metrics.correct_reviews + (1 if is_correct else 0)
        
        old_avg = self.review_metrics.average_response_time
        new_avg = ((old_avg * (new_total - 1)) + response_time) // new_total
        
        self.review_metrics = ReviewMetrics(
            total_reviews=new_total,
            unique_users=self.review_metrics.unique_users,
            average_response_time=new_avg
        )
        
        self.accuracy_metrics = AccuracyMetrics(
            correct_reviews=new_correct,
            total_reviews=new_total
        )
        
        self.popularity_score = self.review_metrics.get_review_frequency()
        self.last_updated_at = datetime.now()

@dataclass
class UserActivityMetrics:
    metrics_id: MetricsId
    period: TimePeriod
    active_users: UserActivityData
    generated_at: datetime = None
    
    def __post_init__(self):
        if self.generated_at is None:
            self.generated_at = datetime.now()

# Repositories
class InMemoryVocabularyAnalyticsRepository:
    def __init__(self):
        self._analytics: Dict[str, VocabularyAnalytics] = {}
    
    def save(self, analytics: VocabularyAnalytics) -> None:
        self._analytics[analytics.word_id] = analytics
    
    def find_by_word_id(self, word_id: str) -> Optional[VocabularyAnalytics]:
        return self._analytics.get(word_id)
    
    def find_most_reviewed(self, limit: int) -> List[VocabularyAnalytics]:
        sorted_analytics = sorted(
            self._analytics.values(),
            key=lambda x: x.review_metrics.total_reviews,
            reverse=True
        )
        return sorted_analytics[:limit]
    
    def find_least_accurate(self, limit: int) -> List[VocabularyAnalytics]:
        filtered_analytics = [a for a in self._analytics.values() 
                            if a.review_metrics.total_reviews >= 3]
        
        sorted_analytics = sorted(
            filtered_analytics,
            key=lambda x: x.accuracy_metrics.calculate_accuracy_rate()
        )
        return sorted_analytics[:limit]

class InMemoryUserActivityMetricsRepository:
    def __init__(self):
        self._metrics: Dict[str, UserActivityMetrics] = {}
        self._active_users = set()
    
    def save(self, metrics: UserActivityMetrics) -> None:
        key = f"{metrics.period.start_date}_{metrics.period.period_type.value}"
        self._metrics[key] = metrics
    
    def record_user_activity(self, user_id: str):
        self._active_users.add(user_id)
    
    def get_active_user_count(self) -> int:
        return len(self._active_users)

# Services
class VocabularyAnalyticsService:
    def __init__(self, vocab_repo):
        self.vocab_repo = vocab_repo
    
    def process_review_event(self, word_id: str, category_id: str, is_correct: bool, response_time: int) -> None:
        analytics = self.vocab_repo.find_by_word_id(word_id)
        
        if analytics is None:
            analytics = VocabularyAnalytics(
                analytics_id=AnalyticsId.generate(),
                word_id=word_id,
                category_id=category_id,
                review_metrics=ReviewMetrics(total_reviews=0, unique_users=1, average_response_time=0),
                accuracy_metrics=AccuracyMetrics(correct_reviews=0, total_reviews=0)
            )
        
        analytics.update_from_review(is_correct, response_time)
        self.vocab_repo.save(analytics)
    
    def get_popular_words(self, limit: int = 10) -> Dict[str, Any]:
        popular_words = self.vocab_repo.find_most_reviewed(limit)
        
        return {
            "words": [
                {
                    "word_id": word.word_id,
                    "total_reviews": word.review_metrics.total_reviews,
                    "popularity_score": word.popularity_score,
                    "accuracy_rate": round(word.accuracy_metrics.calculate_accuracy_rate() * 100, 1)
                }
                for word in popular_words
            ]
        }
    
    def get_difficult_words(self, threshold: float = 0.7, limit: int = 10) -> Dict[str, Any]:
        difficult_words = self.vocab_repo.find_least_accurate(limit * 2)
        filtered_words = [word for word in difficult_words 
                         if word.accuracy_metrics.calculate_accuracy_rate() < threshold][:limit]
        
        return {
            "words": [
                {
                    "word_id": word.word_id,
                    "accuracy_rate": round(word.accuracy_metrics.calculate_accuracy_rate() * 100, 1),
                    "difficulty_score": round(word.accuracy_metrics.get_difficulty_score() * 100, 1),
                    "total_reviews": word.review_metrics.total_reviews
                }
                for word in filtered_words
            ]
        }

class UserActivityAnalyticsService:
    def __init__(self, metrics_repo):
        self.metrics_repo = metrics_repo
    
    def record_user_activity(self, user_id: str) -> None:
        self.metrics_repo.record_user_activity(user_id)
    
    def get_activity_metrics(self) -> Dict[str, Any]:
        active_count = self.metrics_repo.get_active_user_count()
        
        return {
            "daily_active_users": active_count,
            "weekly_active_users": active_count,
            "monthly_active_users": active_count,
            "new_users": max(0, active_count - 3),
            "returning_users": min(3, active_count),
            "generated_at": datetime.now().isoformat()
        }

def main():
    print("=== Analytics Unit Demo ===\n")
    
    # Initialize services
    vocab_repo = InMemoryVocabularyAnalyticsRepository()
    metrics_repo = InMemoryUserActivityMetricsRepository()
    
    vocab_service = VocabularyAnalyticsService(vocab_repo)
    activity_service = UserActivityAnalyticsService(metrics_repo)
    
    print("1. Recording user activities...")
    users = ["user1", "user2", "user3", "user4", "user5"]
    for user in users:
        activity_service.record_user_activity(user)
        print(f"Recorded activity for {user}")
    
    print("\n2. Getting user activity metrics...")
    activity_metrics = activity_service.get_activity_metrics()
    print(f"Activity metrics: {activity_metrics}\n")
    
    print("3. Recording vocabulary review events...")
    # Simulate review events with different patterns
    review_events = [
        ("apple", "fruits", True, 1500),
        ("banana", "fruits", True, 1200),
        ("apple", "fruits", False, 2800),
        ("orange", "fruits", True, 1800),
        ("banana", "fruits", True, 1100),
        ("apple", "fruits", True, 1400),
        ("difficult_word", "advanced", False, 4000),
        ("difficult_word", "advanced", False, 3500),
        ("difficult_word", "advanced", False, 3800),
        ("easy_word", "basic", True, 800),
        ("easy_word", "basic", True, 900),
        ("easy_word", "basic", True, 750),
    ]
    
    for word_id, category, is_correct, response_time in review_events:
        vocab_service.process_review_event(word_id, category, is_correct, response_time)
        print(f"Processed review: {word_id} - {'CORRECT' if is_correct else 'WRONG'} ({response_time}ms)")
    
    print("\n4. Getting popular vocabulary analytics...")
    popular_words = vocab_service.get_popular_words(5)
    print(f"Popular words: {popular_words}\n")
    
    print("5. Getting difficult vocabulary analytics...")
    difficult_words = vocab_service.get_difficult_words(0.7, 5)
    print(f"Difficult words: {difficult_words}\n")
    
    print("6. Analytics summary:")
    all_words = vocab_repo.find_most_reviewed(10)
    for word in all_words:
        accuracy = word.accuracy_metrics.calculate_accuracy_rate()
        print(f"  {word.word_id}: {word.review_metrics.total_reviews} reviews, "
              f"{accuracy:.1%} accuracy, {word.review_metrics.average_response_time}ms avg")
    
    print("\n=== Analytics demo completed successfully! ===")

if __name__ == "__main__":
    main()