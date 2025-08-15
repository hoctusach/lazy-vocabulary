from typing import List
from ..models.vocabulary_data import VocabularyData, CustomWord, VocabularyWord
from ..storage.memory_store import memory_store

class VocabularyService:
    def __init__(self):
        self.store = memory_store
    
    def get_vocabulary_data(self, user_id: str) -> VocabularyData:
        """Get user's vocabulary data"""
        if user_id in self.store.vocabulary_data:
            return VocabularyData(**self.store.vocabulary_data[user_id])
        return VocabularyData(user_id=user_id, sheets={})
    
    def save_vocabulary_data(self, data: VocabularyData) -> bool:
        """Save vocabulary data"""
        self.store.vocabulary_data[data.user_id] = data.dict()
        return True
    
    def get_all_words(self, user_id: str) -> List[VocabularyWord]:
        """Get all words from all sheets"""
        vocab_data = self.get_vocabulary_data(user_id)
        all_words = []
        for sheet_words in vocab_data.sheets.values():
            all_words.extend(sheet_words)
        return all_words
    
    def get_custom_words(self, user_id: str) -> List[CustomWord]:
        """Get user's custom words"""
        words_data = self.store.custom_words.get(user_id, [])
        return [CustomWord(**word) for word in words_data]
    
    def add_custom_word(self, word: CustomWord) -> CustomWord:
        """Add custom word"""
        if word.user_id not in self.store.custom_words:
            self.store.custom_words[word.user_id] = []
        self.store.custom_words[word.user_id].append(word.dict())
        return word
    
    def remove_custom_word(self, user_id: str, word: str, category: str) -> bool:
        """Remove custom word"""
        if user_id in self.store.custom_words:
            words = self.store.custom_words[user_id]
            self.store.custom_words[user_id] = [
                w for w in words if not (w['word'] == word and w['category'] == category)
            ]
            return True
        return False