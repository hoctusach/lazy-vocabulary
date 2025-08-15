from datetime import datetime, timedelta
from typing import List, Dict
from .models import WordProgress, DifficultyLevel

class SpacedRepetitionEngine:
    """Implements spaced repetition algorithm for vocabulary learning"""
    
    # Base intervals in days for each difficulty level
    BASE_INTERVALS = {
        DifficultyLevel.EASY: [1, 3, 7, 14, 30],
        DifficultyLevel.MEDIUM: [1, 2, 5, 10, 21], 
        DifficultyLevel.HARD: [1, 1, 3, 6, 12]
    }
    
    def calculate_next_review(self, progress: WordProgress, is_correct: bool) -> datetime:
        """Calculate next review date based on performance"""
        now = datetime.now()
        
        if not is_correct:
            # Reset to beginning if incorrect
            return now + timedelta(days=1)
        
        # Get appropriate interval based on review count and difficulty
        intervals = self.BASE_INTERVALS[progress.difficulty_level]
        interval_index = min(progress.correct_count, len(intervals) - 1)
        base_interval = intervals[interval_index]
        
        # Apply success rate multiplier
        multiplier = 1.0 + (progress.success_rate - 0.5) * 0.5
        final_interval = max(1, int(base_interval * multiplier))
        
        return now + timedelta(days=final_interval)
    
    def get_due_words(self, all_progress: Dict[str, WordProgress]) -> List[str]:
        """Get list of word IDs that are due for review"""
        now = datetime.now()
        due_words = []
        
        for word_id, progress in all_progress.items():
            if progress.next_review_date is None or progress.next_review_date <= now:
                due_words.append(word_id)
        
        return due_words
    
    def adjust_difficulty(self, progress: WordProgress):
        """Adjust difficulty based on performance"""
        if progress.total_reviews >= 5:
            if progress.success_rate >= 0.8:
                progress.difficulty_level = DifficultyLevel.EASY
            elif progress.success_rate <= 0.4:
                progress.difficulty_level = DifficultyLevel.HARD
            else:
                progress.difficulty_level = DifficultyLevel.MEDIUM