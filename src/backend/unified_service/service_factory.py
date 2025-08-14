"""
Service factory for the unified Lazy Vocabulary backend service.
Handles dependency injection and service initialization.
"""
from application.unified_service import LazyVocabularyService, EventPublisher
from infrastructure.in_memory_repositories import (
    InMemoryUserRepository, InMemorySessionRepository,
    InMemoryUserProgressRepository, InMemoryReviewEventRepository,
    InMemoryMigrationSessionRepository, InMemoryAnalyticsRepository
)
from api.controllers import LazyVocabularyController
from domain.value_objects import generate_id


class LazyVocabularyServiceFactory:
    """Factory for creating and configuring the unified service."""
    
    def __init__(self):
        self._service = None
        self._controller = None
        self._repositories_initialized = False
    
    def get_service(self) -> LazyVocabularyService:
        """Get the unified service instance."""
        if self._service is None:
            self._service = self._create_service()
            if not self._repositories_initialized:
                self._initialize_sample_data()
                self._repositories_initialized = True
        return self._service
    
    def get_controller(self) -> LazyVocabularyController:
        """Get the API controller instance."""
        if self._controller is None:
            service = self.get_service()
            self._controller = LazyVocabularyController(service)
        return self._controller
    
    def _create_service(self) -> LazyVocabularyService:
        """Create and configure the unified service with all dependencies."""
        # Create repositories
        user_repo = InMemoryUserRepository()
        session_repo = InMemorySessionRepository()
        progress_repo = InMemoryUserProgressRepository()
        review_repo = InMemoryReviewEventRepository()
        migration_repo = InMemoryMigrationSessionRepository()
        analytics_repo = InMemoryAnalyticsRepository()
        
        # Create event publisher
        event_publisher = EventPublisher()
        
        # Create and return the unified service
        return LazyVocabularyService(
            user_repo=user_repo,
            session_repo=session_repo,
            progress_repo=progress_repo,
            review_repo=review_repo,
            migration_repo=migration_repo,
            analytics_repo=analytics_repo,
            event_publisher=event_publisher
        )
    
    def _initialize_sample_data(self):
        """Initialize the service with sample data (no vocabulary data since it's handled by local JSON)."""
        # No vocabulary initialization needed since vocabulary is handled by local JSON files
        print("Service initialized without vocabulary data - using local JSON files for vocabulary")


# Global factory instance
_factory_instance = None

def get_service_factory() -> LazyVocabularyServiceFactory:
    """Get the global service factory instance."""
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = LazyVocabularyServiceFactory()
    return _factory_instance