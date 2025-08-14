from typing import List, Optional, Dict
from datetime import date
from ..domain.entities.user_activity_metrics import UserActivityMetrics
from ..domain.entities.vocabulary_analytics import VocabularyAnalytics
from ..domain.repositories.analytics_repository import UserActivityMetricsRepository, VocabularyAnalyticsRepository
from ..domain.value_objects.analytics_data import TimePeriod

class InMemoryUserActivityMetricsRepository(UserActivityMetricsRepository):
    def __init__(self):
        self._metrics: Dict[str, UserActivityMetrics] = {}
    
    def save(self, metrics: UserActivityMetrics) -> None:
        key = f"{metrics.period.start_date}_{metrics.period.period_type.value}"
        self._metrics[key] = metrics
    
    def find_by_period(self, period: TimePeriod) -> Optional[UserActivityMetrics]:
        key = f"{period.start_date}_{period.period_type.value}"
        return self._metrics.get(key)
    
    def find_by_date_range(self, start_date: date, end_date: date) -> List[UserActivityMetrics]:
        return [metrics for metrics in self._metrics.values()
                if start_date <= metrics.period.start_date <= end_date]

class InMemoryVocabularyAnalyticsRepository(VocabularyAnalyticsRepository):
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
        # Filter out words with very few reviews to avoid statistical noise
        filtered_analytics = [a for a in self._analytics.values() 
                            if a.review_metrics.total_reviews >= 3]
        
        sorted_analytics = sorted(
            filtered_analytics,
            key=lambda x: x.accuracy_metrics.calculate_accuracy_rate()
        )
        return sorted_analytics[:limit]