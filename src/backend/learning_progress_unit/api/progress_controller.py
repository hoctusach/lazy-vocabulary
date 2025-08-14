from typing import Dict, Any
from ..application.review_event_processing_service import ReviewEventProcessingService
from ..application.daily_list_generation_service import DailyListGenerationService
from ..domain.value_objects.user_id import UserId
from ..domain.value_objects.srs_data import ReviewResponse, ConfidenceLevel

class ProgressController:
    def __init__(self, 
                 review_service: ReviewEventProcessingService,
                 daily_list_service: DailyListGenerationService):
        self.review_service = review_service
        self.daily_list_service = daily_list_service
    
    def record_review_event(self, user_id: str, word_id: str, is_correct: bool, 
                          confidence: str, response_time: int) -> Dict[str, Any]:
        """Record a review event"""
        try:
            user_id_obj = UserId(user_id)
            confidence_level = ConfidenceLevel(confidence.lower())
            response = ReviewResponse(is_correct=is_correct, confidence=confidence_level)
            
            self.review_service.process_review_event(user_id_obj, word_id, response, response_time)
            
            return {"status": "success", "message": "Review event recorded"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def get_daily_list(self, user_id: str, max_new_words: int = 10, max_review_words: int = 50) -> Dict[str, Any]:
        """Get daily list of words for user"""
        try:
            user_id_obj = UserId(user_id)
            daily_list = self.daily_list_service.generate_daily_list(
                user_id_obj, max_new_words, max_review_words
            )
            
            return {"status": "success", "data": daily_list}
        except Exception as e:
            return {"status": "error", "message": str(e)}