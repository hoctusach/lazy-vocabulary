from typing import List, Dict, Any
from ..domain.entities.vocabulary_analytics import VocabularyAnalytics
from ..domain.repositories.analytics_repository import VocabularyAnalyticsRepository
from ..domain.services.analytics_query_service import AnalyticsQueryService
from ..domain.value_objects.identifiers import AnalyticsId
from ..domain.value_objects.analytics_data import ReviewMetrics, AccuracyMetrics

class VocabularyAnalyticsService:
    def __init__(self, vocab_repo: VocabularyAnalyticsRepository):
        self.vocab_repo = vocab_repo
        self.query_service = AnalyticsQueryService(vocab_repo)
    
    def process_review_event(self, word_id: str, category_id: str, is_correct: bool, response_time: int) -> None:
        """Process a review event and update analytics"""
        analytics = self.vocab_repo.find_by_word_id(word_id)
        
        if analytics is None:
            # Create new analytics entry
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
        """Get most popular vocabulary words"""
        popular_words = self.query_service.get_most_popular_words(limit)
        
        return {
            "words": [
                {
                    "word_id": word.word_id,
                    "total_reviews": word.review_metrics.total_reviews,
                    "popularity_score": word.popularity_score,
                    "accuracy_rate": word.accuracy_metrics.calculate_accuracy_rate()
                }
                for word in popular_words
            ]
        }
    
    def get_difficult_words(self, threshold: float = 0.7, limit: int = 10) -> Dict[str, Any]:
        """Get words that users find difficult"""
        difficult_words = self.query_service.get_difficult_words(threshold, limit)
        
        return {
            "words": [
                {
                    "word_id": word.word_id,
                    "accuracy_rate": word.accuracy_metrics.calculate_accuracy_rate(),
                    "difficulty_score": word.accuracy_metrics.get_difficulty_score(),
                    "total_reviews": word.review_metrics.total_reviews
                }
                for word in difficult_words
            ]
        }