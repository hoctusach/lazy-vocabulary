from datetime import date, timedelta
from typing import List, Optional
from ..models.learning_progress import LearningProgress, LearningStatus, LearningProgressStats
from ..storage.memory_store import memory_store

class LearningProgressService:
    def __init__(self):
        self.store = memory_store
    
    def get_progress(self, user_id: str, word: str) -> Optional[LearningProgress]:
        """Get learning progress for a specific word"""
        user_progress = self.store.learning_progress.get(user_id, {})
        if word in user_progress:
            return LearningProgress(**user_progress[word])
        return None
    
    def update_word_progress(self, user_id: str, word: str) -> LearningProgress:
        """Update progress when word is played"""
        progress = self.get_progress(user_id, word)
        if not progress:
            progress = self._initialize_word(user_id, word)
        
        today = date.today()
        progress.last_played_date = today
        progress.is_learned = True
        progress.review_count += 1
        progress.next_review_date = self._calculate_next_review_date(progress.review_count)
        progress.status = LearningStatus.DUE
        
        # Save to memory
        if user_id not in self.store.learning_progress:
            self.store.learning_progress[user_id] = {}
        self.store.learning_progress[user_id][word] = progress.dict()
        return progress
    
    def retire_word(self, user_id: str, word: str) -> LearningProgress:
        """Mark word as retired"""
        progress = self.get_progress(user_id, word)
        if progress:
            progress.status = LearningStatus.RETIRED
            progress.retired_date = date.today()
            progress.next_review_date = date.today() + timedelta(days=100)
            # Save to memory
            if user_id not in self.store.learning_progress:
                self.store.learning_progress[user_id] = {}
            self.store.learning_progress[user_id][word] = progress.dict()
        return progress
    
    def get_due_words(self, user_id: str) -> List[LearningProgress]:
        """Get words due for review"""
        today = date.today()
        user_progress = self.store.learning_progress.get(user_id, {})
        due_words = []
        for word_data in user_progress.values():
            progress = LearningProgress(**word_data)
            if progress.next_review_date <= today and progress.status == LearningStatus.DUE:
                due_words.append(progress)
        return due_words
    
    def get_new_words(self, user_id: str) -> List[LearningProgress]:
        """Get words not yet learned"""
        user_progress = self.store.learning_progress.get(user_id, {})
        new_words = []
        for word_data in user_progress.values():
            progress = LearningProgress(**word_data)
            if not progress.is_learned and progress.status != LearningStatus.RETIRED:
                new_words.append(progress)
        return new_words
    
    def get_stats(self, user_id: str) -> LearningProgressStats:
        """Get learning progress statistics"""
        user_progress = self.store.learning_progress.get(user_id, {})
        all_progress = [LearningProgress(**data) for data in user_progress.values()] if user_progress else []
        
        return LearningProgressStats(
            total=len(all_progress) if all_progress else 0,
            learned=len([p for p in all_progress if p.is_learned]),
            new=len([p for p in all_progress if not p.is_learned]),
            due=len([p for p in all_progress if p.status == LearningStatus.DUE and p.is_learned]),
            retired=len([p for p in all_progress if p.status == LearningStatus.RETIRED])
        )
    
    def _initialize_word(self, user_id: str, word: str) -> LearningProgress:
        """Initialize progress for new word"""
        return LearningProgress(
            user_id=user_id,
            word=word,
            next_review_date=date.today()
        )
    
    def _calculate_next_review_date(self, review_count: int) -> date:
        """Calculate next review date based on SRS intervals"""
        intervals = {1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 10, 7: 14, 8: 21, 9: 28, 10: 35}
        days = intervals.get(review_count, 60)  # 60 days for mastered words
        return date.today() + timedelta(days=days)