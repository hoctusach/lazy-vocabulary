from datetime import datetime
from typing import List, Dict, Any
from ..domain.repositories.vocabulary_repository import VocabularyRepository
from ..domain.repositories.category_repository import CategoryRepository
from ..domain.services.vocabulary_search_service import VocabularySearchService
from ..domain.value_objects.category_id import CategoryId
from .event_publisher import EventPublisher

class VocabularyQueryService:
    def __init__(self, vocabulary_repo: VocabularyRepository, 
                 category_repo: CategoryRepository,
                 search_service: VocabularySearchService,
                 event_publisher: EventPublisher):
        self.vocabulary_repo = vocabulary_repo
        self.category_repo = category_repo
        self.search_service = search_service
        self.event_publisher = event_publisher
    
    def get_categories(self) -> List[Dict[str, Any]]:
        categories = self.category_repo.find_all()
        return [
            {
                "category_id": cat.category_id.value,
                "name": cat.name.value,
                "description": cat.description,
                "word_count": cat.word_count
            }
            for cat in categories
        ]
    
    def get_words_by_category(self, category_id: str) -> List[Dict[str, Any]]:
        words = self.vocabulary_repo.find_by_category(CategoryId(category_id))
        return [
            {
                "word_id": word.word_id.value,
                "word": word.word.value,
                "meaning": word.meaning.value,
                "example": word.example,
                "translation": word.translation
            }
            for word in words
        ]
    
    def search_vocabulary(self, query: str) -> List[Dict[str, Any]]:
        words = self.search_service.search(query)
        return [
            {
                "word_id": word.word_id.value,
                "word": word.word.value,
                "meaning": word.meaning.value,
                "example": word.example,
                "translation": word.translation
            }
            for word in words
        ]