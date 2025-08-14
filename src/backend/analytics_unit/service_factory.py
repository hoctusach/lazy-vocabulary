from .application.vocabulary_analytics_service import VocabularyAnalyticsService
from .application.user_activity_analytics_service import UserActivityAnalyticsService
from .infrastructure.in_memory_analytics_repository import (
    InMemoryVocabularyAnalyticsRepository,
    InMemoryUserActivityMetricsRepository
)
from .api.analytics_controller import AnalyticsController

class AnalyticsServiceFactory:
    def __init__(self):
        # Infrastructure
        self.vocab_repo = InMemoryVocabularyAnalyticsRepository()
        self.metrics_repo = InMemoryUserActivityMetricsRepository()
        
        # Application services
        self.vocab_service = VocabularyAnalyticsService(self.vocab_repo)
        self.activity_service = UserActivityAnalyticsService(self.metrics_repo)
        
        # API
        self.controller = AnalyticsController(self.vocab_service, self.activity_service)
    
    def get_controller(self) -> AnalyticsController:
        return self.controller