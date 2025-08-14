#!/usr/bin/env python3
"""
Demo script for Learning Progress Unit
Tests the core functionality of progress tracking and SRS algorithm
"""

import sys
import os

# Add the current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from domain.services.srs_algorithm_service import SRSAlgorithmService
from application.review_event_processing_service import ReviewEventProcessingService
from application.daily_list_generation_service import DailyListGenerationService
from infrastructure.in_memory_user_progress_repository import InMemoryUserProgressRepository
from infrastructure.in_memory_review_event_repository import InMemoryReviewEventRepository
from api.progress_controller import ProgressController

class LearningProgressServiceFactory:
    def __init__(self):
        # Infrastructure
        self.progress_repo = InMemoryUserProgressRepository()
        self.event_repo = InMemoryReviewEventRepository()
        
        # Domain services
        self.srs_service = SRSAlgorithmService()
        
        # Application services
        self.review_service = ReviewEventProcessingService(
            self.progress_repo, self.event_repo, self.srs_service
        )
        self.daily_list_service = DailyListGenerationService(self.progress_repo)
        
        # API
        self.controller = ProgressController(self.review_service, self.daily_list_service)
    
    def get_controller(self) -> ProgressController:
        return self.controller

def main():
    print("=== Learning Progress Unit Demo ===\n")
    
    # Initialize service
    factory = LearningProgressServiceFactory()
    controller = factory.get_controller()
    
    # Test user
    user_id = "test-user-123"
    
    print("1. Getting initial daily list (should be empty for reviews)...")
    result = controller.get_daily_list(user_id)
    print(f"Result: {result}\n")
    
    print("2. Recording review events for new words...")
    
    # Record some review events
    words_to_review = ["word_1", "word_2", "word_3"]
    
    for i, word in enumerate(words_to_review):
        is_correct = i % 2 == 0  # Alternate correct/incorrect
        confidence = "high" if is_correct else "low"
        response_time = 2000 + i * 500
        
        result = controller.record_review_event(
            user_id, word, is_correct, confidence, response_time
        )
        print(f"Recorded review for {word}: {result}")
    
    print("\n3. Getting updated daily list...")
    result = controller.get_daily_list(user_id, max_new_words=5, max_review_words=10)
    print(f"Result: {result}\n")
    
    print("4. Recording more review events to test SRS algorithm...")
    
    # Record more events for the same words
    for word in words_to_review[:2]:
        result = controller.record_review_event(
            user_id, word, True, "high", 1500
        )
        print(f"Second review for {word}: {result}")
    
    print("\n5. Final daily list check...")
    result = controller.get_daily_list(user_id)
    print(f"Final result: {result}\n")
    
    print("=== Demo completed successfully! ===")

if __name__ == "__main__":
    main()