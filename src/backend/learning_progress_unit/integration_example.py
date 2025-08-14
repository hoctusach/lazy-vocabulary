#!/usr/bin/env python3
"""
Integration example showing how the Learning Progress Unit
can be integrated with the current vocabulary application
"""

from simple_demo import (
    UserId, ProgressId, ReviewResponse, ConfidenceLevel, SRSData,
    UserProgress, ReviewEvent, SRSAlgorithmService,
    InMemoryUserProgressRepository, InMemoryReviewEventRepository,
    ReviewEventProcessingService, DailyListGenerationService
)

class VocabularyLearningBackend:
    """
    Main backend service that integrates with the frontend application
    """
    
    def __init__(self):
        # Initialize repositories
        self.progress_repo = InMemoryUserProgressRepository()
        self.event_repo = InMemoryReviewEventRepository()
        
        # Initialize services
        self.srs_service = SRSAlgorithmService()
        self.review_service = ReviewEventProcessingService(
            self.progress_repo, self.event_repo, self.srs_service
        )
        self.daily_list_service = DailyListGenerationService(self.progress_repo)
    
    def record_user_review(self, user_id: str, word_id: str, is_correct: bool, 
                          confidence_level: str, response_time_ms: int) -> dict:
        """
        Record a user's review of a vocabulary word
        This would be called from the frontend when user completes a review
        """
        try:
            user_id_obj = UserId(user_id)
            confidence = ConfidenceLevel(confidence_level.lower())
            response = ReviewResponse(is_correct=is_correct, confidence=confidence)
            
            self.review_service.process_review_event(
                user_id_obj, word_id, response, response_time_ms
            )
            
            return {
                "success": True,
                "message": "Review recorded successfully",
                "word_id": word_id,
                "is_correct": is_correct
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_daily_words(self, user_id: str, new_words_count: int = 10, 
                       review_words_count: int = 50) -> dict:
        """
        Get the daily list of words for a user
        This would be called when the user opens the app
        """
        try:
            user_id_obj = UserId(user_id)
            daily_list = self.daily_list_service.generate_daily_list(
                user_id_obj, new_words_count, review_words_count
            )
            
            return {
                "success": True,
                "data": daily_list
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_user_statistics(self, user_id: str) -> dict:
        """
        Get learning statistics for a user
        This would be used for progress tracking and analytics
        """
        try:
            user_id_obj = UserId(user_id)
            all_progress = self.progress_repo.find_by_user(user_id_obj)
            
            if not all_progress:
                return {
                    "success": True,
                    "data": {
                        "total_words": 0,
                        "accuracy_rate": 0.0,
                        "words_due_today": 0,
                        "total_reviews": 0
                    }
                }
            
            total_words = len(all_progress)
            total_reviews = sum(p.total_reviews for p in all_progress)
            total_correct = sum(p.correct_reviews for p in all_progress)
            accuracy_rate = total_correct / total_reviews if total_reviews > 0 else 0.0
            
            due_words = self.progress_repo.find_due_for_review(user_id_obj)
            words_due_today = len(due_words)
            
            return {
                "success": True,
                "data": {
                    "total_words": total_words,
                    "accuracy_rate": round(accuracy_rate * 100, 1),
                    "words_due_today": words_due_today,
                    "total_reviews": total_reviews
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

def demo_integration():
    """
    Demonstrate how the frontend would interact with the backend
    """
    print("=== Integration Demo ===\n")
    
    # Initialize backend
    backend = VocabularyLearningBackend()
    user_id = "frontend-user-123"
    
    print("1. Frontend requests daily words for user...")
    result = backend.get_daily_words(user_id, new_words_count=5, review_words_count=10)
    print(f"Daily words response: {result}\n")
    
    print("2. User reviews some words in the frontend...")
    # Simulate user reviewing words with different outcomes
    review_results = [
        ("word_1", True, "high", 1800),
        ("word_2", False, "low", 3200),
        ("word_3", True, "medium", 2100),
        ("word_4", True, "high", 1500),
        ("word_5", False, "medium", 2800)
    ]
    
    for word_id, is_correct, confidence, response_time in review_results:
        result = backend.record_user_review(user_id, word_id, is_correct, confidence, response_time)
        print(f"Review result for {word_id}: {result}")
    
    print("\n3. Frontend requests user statistics...")
    stats = backend.get_user_statistics(user_id)
    print(f"User statistics: {stats}\n")
    
    print("4. Frontend requests updated daily words...")
    result = backend.get_daily_words(user_id, new_words_count=3, review_words_count=5)
    print(f"Updated daily words: {result}\n")
    
    print("=== Integration demo completed! ===")
    print("\nThis backend can now be integrated with the React frontend by:")
    print("- Creating API endpoints that call these backend methods")
    print("- Using HTTP requests from the frontend to interact with the backend")
    print("- Storing user progress persistently (currently using in-memory storage)")
    print("- Adding real-time synchronization across devices")

if __name__ == "__main__":
    demo_integration()