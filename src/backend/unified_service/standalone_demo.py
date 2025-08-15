#!/usr/bin/env python3

"""
Standalone demo of the Learning Progress Unit
This demonstrates the core functionality without complex imports
"""

import uuid
from datetime import datetime, timedelta, date
from dataclasses import dataclass
from typing import List, Dict, Optional, Any
from enum import Enum

# === Value Objects ===
class ConfidenceLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Severity(Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    INTENSE = "intense"

@dataclass(frozen=True)
class SRSData:
    interval_days: int = 1
    ease_factor: float = 2.5
    repetitions: int = 0
    
    def calculate_next_interval(self, is_correct: bool) -> int:
        if not is_correct:
            return 1
        
        intervals = [1, 2, 3, 5, 7, 10, 14, 21, 28, 35]
        if self.repetitions < len(intervals):
            return intervals[self.repetitions]
        else:
            return 60
    
    def update_after_review(self, is_correct: bool) -> 'SRSData':
        new_repetitions = self.repetitions + 1 if is_correct else 0
        new_interval = self.calculate_next_interval(is_correct)
        
        new_ease_factor = self.ease_factor
        if is_correct:
            new_ease_factor = min(3.0, self.ease_factor + 0.1)
        else:
            new_ease_factor = max(1.3, self.ease_factor - 0.2)
        
        return SRSData(
            interval_days=new_interval,
            ease_factor=new_ease_factor,
            repetitions=new_repetitions
        )

@dataclass(frozen=True)
class ReviewResponse:
    is_correct: bool
    confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM

@dataclass(frozen=True)
class DailyListConfig:
    severity: Severity = Severity.MODERATE
    new_word_ratio: float = 0.4
    review_word_ratio: float = 0.6
    
    def get_daily_word_count(self) -> int:
        if self.severity == Severity.LIGHT:
            return 20
        elif self.severity == Severity.MODERATE:
            return 40
        else:
            return 75
    
    def get_new_word_count(self) -> int:
        return int(self.get_daily_word_count() * self.new_word_ratio)
    
    def get_review_word_count(self) -> int:
        return int(self.get_daily_word_count() * self.review_word_ratio)

# === Entities ===
@dataclass
class UserProgress:
    progress_id: str
    user_id: str
    word_id: str
    srs_data: SRSData
    total_reviews: int = 0
    correct_reviews: int = 0
    last_reviewed_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None
    created_at: datetime = None
    updated_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
    
    def update_progress(self, is_correct: bool, review_time: datetime):
        self.total_reviews += 1
        if is_correct:
            self.correct_reviews += 1
        self.last_reviewed_at = review_time
        self.updated_at = datetime.now()
    
    def get_accuracy_rate(self) -> float:
        if self.total_reviews == 0:
            return 0.0
        return self.correct_reviews / self.total_reviews

@dataclass
class ReviewEvent:
    event_id: str
    session_id: str
    word_id: str
    response: ReviewResponse
    response_time_ms: int
    occurred_at: datetime = None
    
    def __post_init__(self):
        if self.occurred_at is None:
            self.occurred_at = datetime.now()

# === Services ===
class LearningProgressService:
    
    def __init__(self):
        self.user_progress: Dict[str, UserProgress] = {}
        self.category_weights = {
            "phrasal_verbs": 0.13,
            "idioms": 0.07, 
            "topic_vocabulary": 0.44,
            "grammar": 0.03,
            "phrases_collocations": 0.05,
            "word_formation": 0.06
        }
        self.vocabulary = {
            "phrasal_verbs": ["take_off", "put_on", "look_up", "turn_down", "give_up"],
            "idioms": ["break_the_ice", "hit_the_nail", "piece_of_cake"],
            "topic_vocabulary": ["environment", "technology", "education", "health", "business"],
            "grammar": ["present_perfect", "passive_voice"],
            "phrases_collocations": ["make_a_decision", "take_responsibility"],
            "word_formation": ["happiness", "successful", "organization"]
        }
    
    def generate_daily_list(self, user_id: str, config: DailyListConfig) -> Dict[str, List[str]]:
        """Generate daily word list"""
        review_words = self._select_review_words(user_id, config.get_review_word_count())
        new_words = self._select_new_words(user_id, config.get_new_word_count())
        
        return {
            "new_words": new_words,
            "review_words": review_words
        }
    
    def _select_review_words(self, user_id: str, target_count: int) -> List[str]:
        """Select words due for review"""
        user_progress_list = [p for p in self.user_progress.values() if p.user_id == user_id]
        due_words = []
        
        for progress in user_progress_list:
            if (progress.next_review_at and 
                progress.next_review_at.date() <= date.today() and
                progress.srs_data.repetitions < 10):  # Not mastered
                due_words.append(progress.word_id)
        
        return due_words[:target_count]
    
    def _select_new_words(self, user_id: str, target_count: int) -> List[str]:
        """Select new words proportionally by category"""
        learned_words = {p.word_id for p in self.user_progress.values() if p.user_id == user_id}
        selected_words = []
        
        for category, weight in self.category_weights.items():
            category_words = self.vocabulary.get(category, [])
            new_category_words = [w for w in category_words if w not in learned_words]
            
            category_count = int(target_count * weight)
            selected_words.extend(new_category_words[:category_count])
        
        return selected_words[:target_count]
    
    def process_review_events(self, user_id: str, session_id: str, events_data: List[dict]) -> dict:
        """Process review events and update progress"""
        processed_count = 0
        errors = []
        
        for event_data in events_data:
            try:
                self._process_single_event(user_id, session_id, event_data)
                processed_count += 1
            except Exception as e:
                errors.append(f"Error processing {event_data.get('word_id', 'unknown')}: {str(e)}")
        
        return {
            "processed_count": processed_count,
            "errors": errors
        }
    
    def _process_single_event(self, user_id: str, session_id: str, event_data: dict):
        """Process a single review event"""
        word_id = event_data["word_id"]
        is_correct = event_data.get("is_correct", True)
        
        # Create review event
        response = ReviewResponse(is_correct=is_correct)
        event = ReviewEvent(
            event_id=str(uuid.uuid4()),
            session_id=session_id,
            word_id=word_id,
            response=response,
            response_time_ms=event_data.get("response_time_ms", 0)
        )
        
        # Update or create progress
        progress_key = f"{user_id}:{word_id}"
        progress = self.user_progress.get(progress_key)
        
        if not progress:
            progress = UserProgress(
                progress_id=str(uuid.uuid4()),
                user_id=user_id,
                word_id=word_id,
                srs_data=SRSData()
            )
        
        # Update progress using SRS algorithm
        old_srs_data = progress.srs_data
        new_srs_data = old_srs_data.update_after_review(is_correct)
        
        progress.update_progress(is_correct, event.occurred_at)
        progress.srs_data = new_srs_data
        progress.next_review_at = datetime.now() + timedelta(days=new_srs_data.interval_days)
        
        self.user_progress[progress_key] = progress
    
    def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get user learning statistics"""
        user_progress_list = [p for p in self.user_progress.values() if p.user_id == user_id]
        
        if not user_progress_list:
            return {
                "total_words": 0,
                "accuracy_rate": 0.0,
                "words_mastered": 0,
                "reviews_today": 0
            }
        
        total_reviews = sum(p.total_reviews for p in user_progress_list)
        correct_reviews = sum(p.correct_reviews for p in user_progress_list)
        accuracy_rate = (correct_reviews / total_reviews * 100) if total_reviews > 0 else 0.0
        words_mastered = len([p for p in user_progress_list if p.srs_data.repetitions >= 10])
        
        return {
            "total_words": len(user_progress_list),
            "accuracy_rate": round(accuracy_rate, 1),
            "words_mastered": words_mastered,
            "reviews_today": len([p for p in user_progress_list if 
                                p.last_reviewed_at and 
                                p.last_reviewed_at.date() == date.today()])
        }

def main():
    print("=== Learning Progress Unit Demo ===\\n")
    
    # Initialize service
    service = LearningProgressService()
    user_id = "Admin"
    session_id = str(uuid.uuid4())
    
    # Test 1: Generate Daily List
    print("1. Generating daily list...")
    config = DailyListConfig(severity=Severity.MODERATE)
    daily_list = service.generate_daily_list(user_id, config)
    
    print(f"   New words: {daily_list['new_words']}")
    print(f"   Review words: {daily_list['review_words']}\\n")
    
    # Test 2: Record Review Events
    print("2. Recording review events...")
    review_events = [
        {"word_id": "take_off", "is_correct": True, "response_time_ms": 2500},
        {"word_id": "environment", "is_correct": False, "response_time_ms": 4000},
        {"word_id": "break_the_ice", "is_correct": True, "response_time_ms": 3200},
        {"word_id": "technology", "is_correct": True, "response_time_ms": 1800}
    ]
    
    result = service.process_review_events(user_id, session_id, review_events)
    print(f"   Processed: {result['processed_count']} events")
    if result['errors']:
        print(f"   Errors: {result['errors']}")
    print()
    
    # Test 3: Get Statistics
    print("3. Getting user statistics...")
    stats = service.get_user_statistics(user_id)
    
    print(f"   Total words: {stats['total_words']}")
    print(f"   Accuracy rate: {stats['accuracy_rate']}%")
    print(f"   Words mastered: {stats['words_mastered']}")
    print(f"   Reviews today: {stats['reviews_today']}\\n")
    
    # Test 4: Generate Daily List Again (should show review words)
    print("4. Generating daily list again (should include review words)...")
    daily_list2 = service.generate_daily_list(user_id, config)
    print(f"   New words: {daily_list2['new_words']}")
    print(f"   Review words: {daily_list2['review_words']}\\n")
    
    # Test 5: Simulate SRS scheduling
    print("5. Testing SRS scheduling...")
    for word_id, progress in service.user_progress.items():
        if progress.user_id == user_id:
            print(f"   {progress.word_id}: interval={progress.srs_data.interval_days} days, "
                  f"repetitions={progress.srs_data.repetitions}, "
                  f"next_review={progress.next_review_at.strftime('%Y-%m-%d') if progress.next_review_at else 'None'}")
    print()
    
    print("=== Demo completed successfully! ===")
    print("\\nKey Features Demonstrated:")
    print("- Daily list generation with new/review word ratios")
    print("- Category-based word selection")
    print("- Spaced repetition scheduling (1,2,3,5,7,10,14,21,28,35,60+ days)")
    print("- Progress tracking and accuracy calculation")
    print("- Review event processing")
    print("- User statistics and analytics")

if __name__ == "__main__":
    main()