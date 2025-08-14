"""
Service Factory for Vocabulary Service Unit
Provides dependency injection and service wiring
"""

from .infrastructure.in_memory_vocabulary_repository import InMemoryVocabularyRepository
from .infrastructure.in_memory_category_repository import InMemoryCategoryRepository
from .domain.services.vocabulary_search_service import VocabularySearchService
from .application.vocabulary_query_service import VocabularyQueryService
from .application.content_administration_service import ContentAdministrationService
from .application.event_publisher import EventPublisher
from .api.vocabulary_controller import VocabularyController

class VocabularyServiceFactory:
    def __init__(self):
        # Infrastructure layer
        self.vocabulary_repo = InMemoryVocabularyRepository()
        self.category_repo = InMemoryCategoryRepository()
        self.event_publisher = EventPublisher()
        
        # Domain services
        self.search_service = VocabularySearchService(self.vocabulary_repo)
        
        # Application services
        self.query_service = VocabularyQueryService(
            self.vocabulary_repo, 
            self.category_repo, 
            self.search_service, 
            self.event_publisher
        )
        self.admin_service = ContentAdministrationService(
            self.vocabulary_repo, 
            self.category_repo, 
            self.event_publisher
        )
        
        # API layer
        self.controller = VocabularyController(self.query_service, self.admin_service)
    
    def get_controller(self) -> VocabularyController:
        return self.controller
    
    def get_query_service(self) -> VocabularyQueryService:
        return self.query_service
    
    def get_admin_service(self) -> ContentAdministrationService:
        return self.admin_service