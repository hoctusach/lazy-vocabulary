from typing import List
from ..entities.vocabulary_word import VocabularyWord
from ..repositories.vocabulary_repository import VocabularyRepository

class VocabularySearchService:
    def __init__(self, vocabulary_repo: VocabularyRepository):
        self.vocabulary_repo = vocabulary_repo
    
    def search(self, query: str) -> List[VocabularyWord]:
        if not query or not query.strip():
            return []
        
        results = self.vocabulary_repo.search(query.strip().lower())
        return self._rank_results(results, query)
    
    def _rank_results(self, results: List[VocabularyWord], query: str) -> List[VocabularyWord]:
        # Simple ranking: exact matches first, then partial matches
        exact_matches = []
        partial_matches = []
        
        query_lower = query.lower()
        
        for word in results:
            if word.word.value.lower() == query_lower:
                exact_matches.append(word)
            else:
                partial_matches.append(word)
        
        return exact_matches + partial_matches