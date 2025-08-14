from abc import ABC, abstractmethod
from typing import List, Optional
from ..entities.vocabulary_word import VocabularyWord
from ..value_objects.word_id import WordId
from ..value_objects.category_id import CategoryId

class VocabularyRepository(ABC):
    @abstractmethod
    def save(self, word: VocabularyWord) -> None:
        pass
    
    @abstractmethod
    def find_by_id(self, word_id: WordId) -> Optional[VocabularyWord]:
        pass
    
    @abstractmethod
    def find_by_category(self, category_id: CategoryId) -> List[VocabularyWord]:
        pass
    
    @abstractmethod
    def search(self, query: str) -> List[VocabularyWord]:
        pass