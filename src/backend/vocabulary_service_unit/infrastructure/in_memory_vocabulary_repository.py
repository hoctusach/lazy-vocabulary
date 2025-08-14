from typing import List, Optional, Dict
from ..domain.entities.vocabulary_word import VocabularyWord
from ..domain.repositories.vocabulary_repository import VocabularyRepository
from ..domain.value_objects.word_id import WordId
from ..domain.value_objects.category_id import CategoryId

class InMemoryVocabularyRepository(VocabularyRepository):
    def __init__(self):
        self._words: Dict[str, VocabularyWord] = {}
    
    def save(self, word: VocabularyWord) -> None:
        self._words[word.word_id.value] = word
    
    def find_by_id(self, word_id: WordId) -> Optional[VocabularyWord]:
        return self._words.get(word_id.value)
    
    def find_by_category(self, category_id: CategoryId) -> List[VocabularyWord]:
        return [word for word in self._words.values() 
                if word.category_id.value == category_id.value]
    
    def search(self, query: str) -> List[VocabularyWord]:
        query_lower = query.lower()
        results = []
        
        for word in self._words.values():
            if (query_lower in word.word.value.lower() or 
                query_lower in word.meaning.value.lower() or
                (word.example and query_lower in word.example.lower()) or
                (word.translation and query_lower in word.translation.lower())):
                results.append(word)
        
        return results