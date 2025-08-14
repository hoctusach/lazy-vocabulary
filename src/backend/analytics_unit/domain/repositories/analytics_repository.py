from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import date
from ..entities.user_activity_metrics import UserActivityMetrics
from ..entities.vocabulary_analytics import VocabularyAnalytics
from ..value_objects.analytics_data import TimePeriod

class UserActivityMetricsRepository(ABC):
    @abstractmethod
    def save(self, metrics: UserActivityMetrics) -> None:
        pass
    
    @abstractmethod
    def find_by_period(self, period: TimePeriod) -> Optional[UserActivityMetrics]:
        pass
    
    @abstractmethod
    def find_by_date_range(self, start_date: date, end_date: date) -> List[UserActivityMetrics]:
        pass

class VocabularyAnalyticsRepository(ABC):
    @abstractmethod
    def save(self, analytics: VocabularyAnalytics) -> None:
        pass
    
    @abstractmethod
    def find_by_word_id(self, word_id: str) -> Optional[VocabularyAnalytics]:
        pass
    
    @abstractmethod
    def find_most_reviewed(self, limit: int) -> List[VocabularyAnalytics]:
        pass
    
    @abstractmethod
    def find_least_accurate(self, limit: int) -> List[VocabularyAnalytics]:
        pass