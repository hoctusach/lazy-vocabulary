from datetime import datetime
from typing import List, Dict, Any
from ..domain.entities.vocabulary_word import VocabularyWord
from ..domain.entities.category import Category
from ..domain.value_objects.word_id import WordId
from ..domain.value_objects.word_text import WordText
from ..domain.value_objects.meaning import Meaning
from ..domain.value_objects.category_id import CategoryId
from ..domain.value_objects.category_name import CategoryName
from ..domain.repositories.vocabulary_repository import VocabularyRepository
from ..domain.repositories.category_repository import CategoryRepository
from ..domain.events.vocabulary_word_added import VocabularyWordAdded
from ..domain.events.category_created import CategoryCreated
from .event_publisher import EventPublisher

class ContentAdministrationService:
    def __init__(self, vocabulary_repo: VocabularyRepository,
                 category_repo: CategoryRepository,
                 event_publisher: EventPublisher):
        self.vocabulary_repo = vocabulary_repo
        self.category_repo = category_repo
        self.event_publisher = event_publisher
    
    def create_category(self, name: str, description: str = None) -> Dict[str, Any]:
        category_name = CategoryName(name)
        
        # Check if category already exists
        existing = self.category_repo.find_by_name(category_name)
        if existing:
            raise ValueError(f"Category '{name}' already exists")
        
        category = Category(
            category_id=CategoryId.generate(),
            name=category_name,
            description=description
        )
        
        self.category_repo.save(category)
        
        event = CategoryCreated(
            category_id=category.category_id,
            name=category.name,
            occurred_at=datetime.now()
        )
        self.event_publisher.publish(event)
        
        return {
            "category_id": category.category_id.value,
            "name": category.name.value,
            "description": category.description
        }
    
    def add_vocabulary_word(self, word_text: str, meaning: str, 
                           category_id: str, example: str = None, 
                           translation: str = None) -> Dict[str, Any]:
        
        # Validate category exists
        category = self.category_repo.find_by_id(CategoryId(category_id))
        if not category:
            raise ValueError(f"Category '{category_id}' not found")
        
        word = VocabularyWord(
            word_id=WordId.generate(),
            word=WordText(word_text),
            meaning=Meaning(meaning),
            category_id=CategoryId(category_id),
            example=example,
            translation=translation
        )
        
        self.vocabulary_repo.save(word)
        
        # Update category word count
        category.word_count += 1
        self.category_repo.save(category)
        
        event = VocabularyWordAdded(
            word_id=word.word_id,
            category_id=word.category_id,
            word=word.word,
            occurred_at=datetime.now()
        )
        self.event_publisher.publish(event)
        
        return {
            "word_id": word.word_id.value,
            "word": word.word.value,
            "meaning": word.meaning.value,
            "category_id": word.category_id.value
        }