from typing import List
from ..repositories.analytics_repository import VocabularyAnalyticsRepository
from ..entities.vocabulary_analytics import VocabularyAnalytics

class AnalyticsQueryService:
    def __init__(self, vocab_repo: VocabularyAnalyticsRepository):
        self.vocab_repo = vocab_repo
    
    def get_most_popular_words(self, limit: int = 10) -> List[VocabularyAnalytics]:
        """Get most reviewed words"""
        return self.vocab_repo.find_most_reviewed(limit)
    
    def get_difficult_words(self, accuracy_threshold: float = 0.7, limit: int = 10) -> List[VocabularyAnalytics]:
        """Get words with low accuracy rates"""
        least_accurate = self.vocab_repo.find_least_accurate(limit * 2)  # Get more to filter
        return [word for word in least_accurate 
                if word.accuracy_metrics.calculate_accuracy_rate() < accuracy_threshold][:limit]