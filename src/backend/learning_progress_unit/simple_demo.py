#!/usr/bin/env python3
"""
Simple demo script for Learning Progress Unit
Tests the core functionality without complex imports
"""

import uuid
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Optional, Dict
from enum import Enum

# Value Objects
class ConfidenceLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

@dataclass(frozen=True)
class UserId:
    value: str
    
    @classmethod
    def generate(cls):
        return cls(str(uuid.uuid4()))

@dataclass(frozen=True)
class ProgressId:
    value: str
    
    @classmethod
    def generate(cls):
        return cls(str(uuid.uuid4()))

@dataclass(frozen=True)
class ReviewResponse:
    is_correct: bool
    confidence: ConfidenceLevel

@dataclass(frozen=True)
class SRSData:
    interval: int
    ease_factor: float
    repetitions: int
    
    def calculate_next_interval(self, response: ReviewResponse) -> int:
        if not response.is_correct:
            return 1
        if self.repetitions == 0:
            return 1
        elif self.repetitions == 1:
            return 6
        else:
            return max(1, int(self.interval * self.ease_factor))
    
    def update_ease_factor(self, response: ReviewResponse) -> float:
        if not response.is_correct:
            return max(1.3, self.ease_factor - 0.2)
        
        confidence_modifier = {
            ConfidenceLevel.LOW: -0.15,
            ConfidenceLevel.MEDIUM: 0.0,
            ConfidenceLevel.HIGH: 0.1
        }
        
        new_factor = self.ease_factor + confidence_modifier[response.confidence]
        return max(1.3, new_factor)

# Entities
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

@dataclass
class ReviewEvent:
    event_id: str
    user_id: UserId
    word_id: str
    response: ReviewResponse
    response_time: int
    occurred_at: datetime = None
    
    def __post_init__(self):
        if self.occurred_at is None:
            self.occurred_at = datetime.now()

# Services
class SRSAlgorithmService:
    def update_progress(self, progress: UserProgress, event: ReviewEvent) -> UserProgress:
        new_srs_data = self.calculate_next_review(progress.srs_data, event.response)
        
        new_total_reviews = progress.total_reviews + 1
        new_correct_reviews = progress.correct_reviews + (1 if event.response.is_correct else 0)
        
        next_review_at = datetime.now() + timedelta(days=new_srs_data.interval)
        
        return UserProgress(
            progress_id=progress.progress_id,
            user_id=progress.user_id,
            word_id=progress.word_id,
            srs_data=new_srs_data,
            total_reviews=new_total_reviews,
            correct_reviews=new_correct_reviews,
            last_reviewed_at=event.occurred_at,
            next_review_at=next_review_at,
            created_at=progress.created_at
        )
    
    def calculate_next_review(self, srs_data: SRSData, response: ReviewResponse) -> SRSData:
        new_interval = srs_data.calculate_next_interval(response)
        new_ease_factor = srs_data.update_ease_factor(response)
        new_repetitions = srs_data.repetitions + 1 if response.is_correct else 0
        
        return SRSData(
            interval=new_interval,
            ease_factor=new_ease_factor,
            repetitions=new_repetitions
        )

# In-memory repositories
class InMemoryUserProgressRepository:
    def __init__(self):
        self._progress: Dict[str, UserProgress] = {}
    
    def save(self, progress: UserProgress) -> None:
        key = f"{progress.user_id.value}:{progress.word_id}"
        self._progress[key] = progress
    
    def find_by_user_and_word(self, user_id: UserId, word_id: str) -> Optional[UserProgress]:
        key = f"{user_id.value}:{word_id}"
        return self._progress.get(key)
    
    def find_by_user(self, user_id: UserId) -> List[UserProgress]:
        return [progress for progress in self._progress.values() 
                if progress.user_id.value == user_id.value]
    
    def find_due_for_review(self, user_id: UserId, date: datetime = None) -> List[UserProgress]:
        if date is None:
            date = datetime.now()
        
        user_progress = self.find_by_user(user_id)
        return [progress for progress in user_progress 
                if progress.is_due_for_review(date)]

class InMemoryReviewEventRepository:
    def __init__(self):
        self._events: Dict[str, ReviewEvent] = {}
    
    def save(self, event: ReviewEvent) -> None:
        self._events[event.event_id] = event

# Application services
class ReviewEventProcessingService:
    def __init__(self, progress_repo, event_repo, srs_service):
        self.progress_repo = progress_repo
        self.event_repo = event_repo
        self.srs_service = srs_service
    
    def process_review_event(self, user_id: UserId, word_id: str, response: ReviewResponse, response_time: int) -> None:
        event = ReviewEvent(
            event_id=str(uuid.uuid4()),
            user_id=user_id,
            word_id=word_id,
            response=response,
            response_time=response_time
        )
        
        self.event_repo.save(event)
        
        progress = self.progress_repo.find_by_user_and_word(user_id, word_id)
        if progress is None:
            progress = UserProgress(
                progress_id=ProgressId.generate(),
                user_id=user_id,
                word_id=word_id,
                srs_data=SRSData(interval=1, ease_factor=2.5, repetitions=0)
            )
        
        updated_progress = self.srs_service.update_progress(progress, event)
        self.progress_repo.save(updated_progress)

class DailyListGenerationService:
    def __init__(self, progress_repo):
        self.progress_repo = progress_repo
    
    def generate_daily_list(self, user_id: UserId, max_new_words: int = 10, max_review_words: int = 50) -> Dict[str, List[str]]:
        due_words = self.progress_repo.find_due_for_review(user_id, datetime.now())
        review_words = [progress.word_id for progress in due_words[:max_review_words]]
        
        all_progress = self.progress_repo.find_by_user(user_id)
        learned_word_ids = {progress.word_id for progress in all_progress}
        
        available_words = [f"word_{i}" for i in range(1, 101)]
        new_words = [word for word in available_words if word not in learned_word_ids][:max_new_words]
        
        return {
            "review_words": review_words,
            "new_words": new_words,
            "generated_at": datetime.now().isoformat()
        }

def main():
    print("=== Learning Progress Unit Demo ===\n")
    
    # Initialize services
    progress_repo = InMemoryUserProgressRepository()
    event_repo = InMemoryReviewEventRepository()
    srs_service = SRSAlgorithmService()
    
    review_service = ReviewEventProcessingService(progress_repo, event_repo, srs_service)
    daily_list_service = DailyListGenerationService(progress_repo)
    
    # Test user
    user_id = UserId("test-user-123")
    
    print("1. Getting initial daily list...")
    daily_list = daily_list_service.generate_daily_list(user_id)
    print(f"Initial daily list: {daily_list}\n")
    
    print("2. Recording review events...")
    words_to_review = ["word_1", "word_2", "word_3"]
    
    for i, word in enumerate(words_to_review):
        is_correct = i % 2 == 0
        confidence = ConfidenceLevel.HIGH if is_correct else ConfidenceLevel.LOW
        response = ReviewResponse(is_correct=is_correct, confidence=confidence)
        response_time = 2000 + i * 500
        
        review_service.process_review_event(user_id, word, response, response_time)
        print(f"Recorded review for {word}: correct={is_correct}, confidence={confidence.value}")
    
    print("\n3. Getting updated daily list...")
    daily_list = daily_list_service.generate_daily_list(user_id, max_new_words=5, max_review_words=10)
    print(f"Updated daily list: {daily_list}\n")
    
    print("4. Testing SRS algorithm with more reviews...")
    for word in words_to_review[:2]:
        response = ReviewResponse(is_correct=True, confidence=ConfidenceLevel.HIGH)
        review_service.process_review_event(user_id, word, response, 1500)
        print(f"Second review for {word}: correct=True, confidence=high")
    
    print("\n5. Final progress check...")
    all_progress = progress_repo.find_by_user(user_id)
    for progress in all_progress:
        accuracy = progress.correct_reviews / progress.total_reviews if progress.total_reviews > 0 else 0
        print(f"Word {progress.word_id}: {progress.total_reviews} reviews, {accuracy:.1%} accuracy, next review: {progress.next_review_at.strftime('%Y-%m-%d %H:%M')}")
    
    print("\n=== Demo completed successfully! ===")

if __name__ == "__main__":
    main()