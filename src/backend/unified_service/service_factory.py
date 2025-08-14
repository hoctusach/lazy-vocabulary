"""
Service factory for the unified Lazy Vocabulary backend service.
Handles dependency injection and service initialization.
"""
from application.unified_service import LazyVocabularyService, EventPublisher
from infrastructure.in_memory_repositories import (
    InMemoryUserRepository, InMemorySessionRepository, InMemoryVocabularyRepository,
    InMemoryCategoryRepository, InMemoryUserProgressRepository, InMemoryReviewEventRepository,
    InMemoryMigrationSessionRepository, InMemoryAnalyticsRepository
)
from api.controllers import LazyVocabularyController
from domain.entities import Category, VocabularyWord
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
        vocab_repo = InMemoryVocabularyRepository()
        category_repo = InMemoryCategoryRepository()
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
            vocab_repo=vocab_repo,
            category_repo=category_repo,
            progress_repo=progress_repo,
            review_repo=review_repo,
            migration_repo=migration_repo,
            analytics_repo=analytics_repo,
            event_publisher=event_publisher
        )
    
    def _initialize_sample_data(self):
        """Initialize the service with sample vocabulary data."""
        service = self._service
        
        # Create sample categories
        categories_data = [
            ("phrasal verbs", "Common phrasal verbs used in everyday English"),
            ("idioms", "Popular English idioms and their meanings"),
            ("topic vocab", "Vocabulary organized by specific topics"),
            ("grammar", "Grammar-related vocabulary and terms"),
            ("phrases, collocations", "Common phrases and word combinations"),
            ("word formation", "Prefixes, suffixes, and word formation patterns")
        ]
        
        category_ids = {}
        for name, description in categories_data:
            result = service.create_category(name, description)
            if result["success"]:
                category_ids[name] = result["data"]["category_id"]
        
        # Create sample vocabulary words
        sample_words = [
            # Phrasal verbs
            ("break down", "to stop working; to analyze", category_ids.get("phrasal verbs"), 
             "My car broke down on the highway.", "descomponerse"),
            ("give up", "to stop trying; to surrender", category_ids.get("phrasal verbs"),
             "Don't give up on your dreams.", "rendirse"),
            ("look after", "to take care of", category_ids.get("phrasal verbs"),
             "She looks after her elderly parents.", "cuidar"),
            
            # Idioms
            ("break the ice", "to start a conversation in a social setting", category_ids.get("idioms"),
             "He told a joke to break the ice.", "romper el hielo"),
            ("piece of cake", "something very easy", category_ids.get("idioms"),
             "The exam was a piece of cake.", "pan comido"),
            ("hit the books", "to study hard", category_ids.get("idioms"),
             "I need to hit the books for tomorrow's test.", "estudiar intensamente"),
            
            # Topic vocab
            ("sustainable", "able to be maintained without harming the environment", category_ids.get("topic vocab"),
             "We need sustainable energy sources.", "sostenible"),
            ("innovation", "the introduction of new ideas or methods", category_ids.get("topic vocab"),
             "Innovation drives economic growth.", "innovación"),
            
            # Grammar
            ("subjunctive", "a grammatical mood expressing doubt or possibility", category_ids.get("grammar"),
             "Use the subjunctive after 'if I were you'.", "subjuntivo"),
            
            # Phrases and collocations
            ("make progress", "to advance or improve", category_ids.get("phrases, collocations"),
             "We're making good progress on the project.", "hacer progreso"),
            
            # Word formation
            ("un-", "prefix meaning 'not' or 'opposite of'", category_ids.get("word formation"),
             "Unhappy means not happy.", "prefijo negativo")
        ]
        
        for word_text, meaning, category_id, example, translation in sample_words:
            if category_id:  # Only add if category exists
                service.add_vocabulary_word(word_text, meaning, category_id, example, translation)
        
        print(f"Initialized service with {len(categories_data)} categories and {len(sample_words)} vocabulary words")


# Global factory instance
_factory_instance = None

def get_service_factory() -> LazyVocabularyServiceFactory:
    """Get the global service factory instance."""
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = LazyVocabularyServiceFactory()
    return _factory_instance