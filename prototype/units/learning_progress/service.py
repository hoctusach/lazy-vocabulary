from datetime import datetime
from typing import Dict, List, Optional
from infrastructure import Event, event_bus, local_storage
from .models import WordProgress, LearningSession, DifficultyLevel
from .spaced_repetition import SpacedRepetitionEngine

class LearningProgressService:
    """Manages learning progress and spaced repetition"""
    
    STORAGE_KEY = 'learningProgress'
    
    def __init__(self):
        self.engine = SpacedRepetitionEngine()
        self._progress: Dict[str, WordProgress] = {}
        self._load_progress()
        
        # Subscribe to events
        event_bus.subscribe('word_reviewed', self._handle_word_reviewed)
        event_bus.subscribe('session_completed', self._handle_session_completed)
    
    def _load_progress(self):
        """Load progress from storage"""
        data = local_storage.get_json(self.STORAGE_KEY, {})
        for word_id, progress_data in data.items():
            self._progress[word_id] = WordProgress(
                word_id=progress_data['word_id'],
                correct_count=progress_data.get('correct_count', 0),
                incorrect_count=progress_data.get('incorrect_count', 0),
                last_reviewed=datetime.fromisoformat(progress_data['last_reviewed']) if progress_data.get('last_reviewed') else None,
                difficulty_level=DifficultyLevel(progress_data.get('difficulty_level', 2)),
                next_review_date=datetime.fromisoformat(progress_data['next_review_date']) if progress_data.get('next_review_date') else None
            )
    
    def _save_progress(self):
        """Save progress to storage"""
        data = {}
        for word_id, progress in self._progress.items():
            data[word_id] = {
                'word_id': progress.word_id,
                'correct_count': progress.correct_count,
                'incorrect_count': progress.incorrect_count,
                'last_reviewed': progress.last_reviewed.isoformat() if progress.last_reviewed else None,
                'difficulty_level': progress.difficulty_level.value,
                'next_review_date': progress.next_review_date.isoformat() if progress.next_review_date else None
            }
        local_storage.set_json(self.STORAGE_KEY, data)
    
    def get_due_words(self) -> List[str]:
        """Get words due for review"""
        return self.engine.get_due_words(self._progress)
    
    def get_progress(self, word_id: str) -> Optional[WordProgress]:
        """Get progress for a specific word"""
        return self._progress.get(word_id)
    
    def _handle_word_reviewed(self, event: Event):
        """Handle word review event"""
        word_id = event.data['word_id']
        is_correct = event.data['is_correct']
        
        if word_id not in self._progress:
            self._progress[word_id] = WordProgress(word_id=word_id)
        
        progress = self._progress[word_id]
        
        # Update counts
        if is_correct:
            progress.correct_count += 1
        else:
            progress.incorrect_count += 1
        
        # Update timing
        progress.last_reviewed = datetime.now()
        progress.next_review_date = self.engine.calculate_next_review(progress, is_correct)
        
        # Adjust difficulty
        self.engine.adjust_difficulty(progress)
        
        # Save changes
        self._save_progress()
        
        # Publish progress updated event
        event_bus.publish(Event('progress_updated', {
            'word_id': word_id,
            'progress': progress
        }))
    
    def _handle_session_completed(self, event: Event):
        """Handle session completion event"""
        session = event.data['session']
        
        # Publish analytics event
        event_bus.publish(Event('learning_analytics_updated', {
            'session_id': session.session_id,
            'total_words': session.total_words,
            'correct_words': session.correct_words,
            'accuracy': session.correct_words / session.total_words if session.total_words > 0 else 0
        }))