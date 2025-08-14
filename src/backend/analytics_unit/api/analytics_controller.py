from typing import Dict, Any
from ..application.vocabulary_analytics_service import VocabularyAnalyticsService
from ..application.user_activity_analytics_service import UserActivityAnalyticsService

class AnalyticsController:
    def __init__(self, 
                 vocab_service: VocabularyAnalyticsService,
                 activity_service: UserActivityAnalyticsService):
        self.vocab_service = vocab_service
        self.activity_service = activity_service
    
    def get_popular_vocabulary(self, limit: int = 10) -> Dict[str, Any]:
        """Get most popular vocabulary words"""
        try:
            result = self.vocab_service.get_popular_words(limit)
            return {"status": "success", "data": result}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def get_difficult_vocabulary(self, threshold: float = 0.7, limit: int = 10) -> Dict[str, Any]:
        """Get words that users find difficult"""
        try:
            result = self.vocab_service.get_difficult_words(threshold, limit)
            return {"status": "success", "data": result}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def get_user_activity(self, period: str = "daily") -> Dict[str, Any]:
        """Get user activity metrics"""
        try:
            result = self.activity_service.get_activity_metrics(period)
            return {"status": "success", "data": result}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def record_review_analytics(self, word_id: str, category_id: str, 
                              is_correct: bool, response_time: int) -> Dict[str, Any]:
        """Record analytics from a review event"""
        try:
            self.vocab_service.process_review_event(word_id, category_id, is_correct, response_time)
            return {"status": "success", "message": "Analytics recorded"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def record_user_activity(self, user_id: str) -> Dict[str, Any]:
        """Record user activity"""
        try:
            self.activity_service.record_user_activity(user_id)
            return {"status": "success", "message": "Activity recorded"}
        except Exception as e:
            return {"status": "error", "message": str(e)}