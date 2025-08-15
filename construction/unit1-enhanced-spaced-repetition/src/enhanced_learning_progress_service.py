"""
Enhanced Learning Progress Service - Main orchestrator for Unit 1
"""
from datetime import datetime
from event_bus import event_bus, Event
from repositories.learning_progress_repository import LearningProgressRepository
from services.timing_calculator import TimingCalculator
from services.review_interval_calculator import ReviewIntervalCalculator
from models.learning_progress import EnhancedLearningProgress

class EnhancedLearningProgressService:
    """Main service for enhanced learning progress with FR3 features"""
    
    def __init__(self):
        self.repository = LearningProgressRepository()
        self.timing_calculator = TimingCalculator()
        self.review_calculator = ReviewIntervalCalculator()
        
        # Subscribe to events
        event_bus.subscribe('word_reviewed', self._handle_word_reviewed)
        event_bus.subscribe('playback_completed', self._handle_playback_completed)
        event_bus.subscribe('date_changed', self._handle_date_changed)
        
        # Migrate existing data on initialization
        self.repository.migrate_existing_data()
    
    def get_progress(self, word_key: str) -> EnhancedLearningProgress:
        """Get or create progress for a word"""
        progress = self.repository.get_progress(word_key)
        if progress is None:
            progress = EnhancedLearningProgress(word=word_key)
            self.repository.save_progress(word_key, progress)
        return progress
    
    def update_word_exposure(self, word_key: str):
        """Update word exposure and timing (existing functionality)"""
        progress = self.get_progress(word_key)
        now = datetime.now().isoformat()
        
        # Update exposure tracking
        progress.exposures_today += 1
        progress.last_exposure_time = now
        progress.next_allowed_time = self.timing_calculator.calculate_next_allowed_time(
            progress.exposures_today, now
        )
        
        self.repository.save_progress(word_key, progress)
        
        # Publish exposure event
        event_bus.publish(Event('word_exposed', {
            'word_key': word_key,
            'exposures_today': progress.exposures_today
        }))
    
    def handle_implicit_review(self, word_key: str):
        """Handle implicit review completion (FR3.3)"""
        progress = self.get_progress(word_key)
        today = datetime.now().isoformat().split('T')[0]
        
        # FR3.3: Implicit review update
        progress.review_count += 1
        progress.last_played_date = today
        progress.next_review_date = self.review_calculator.calculate_next_review_date(
            progress.review_count, today
        )
        
        # FR3.4: Check mastery
        if progress.review_count >= 10 and not progress.is_mastered:
            progress.is_mastered = True
            progress.next_review_date = self.review_calculator.calculate_mastery_review_date()
            
            # Publish mastery event
            event_bus.publish(Event('word_mastered', {
                'word_key': word_key,
                'review_count': progress.review_count
            }))
        
        self.repository.save_progress(word_key, progress)
        
        # Publish review completed event
        event_bus.publish(Event('review_completed', {
            'word_key': word_key,
            'review_count': progress.review_count,
            'is_mastered': progress.is_mastered
        }))
    
    def retire_word(self, word_key: str):
        """Retire a word (FR3.2)"""
        progress = self.get_progress(word_key)
        
        # FR3.2: Reset progress when retiring
        progress.retired = True
        progress.is_mastered = False
        progress.review_count = 0
        progress.next_review_date = None
        
        self.repository.save_progress(word_key, progress)
        
        # Publish retirement event
        event_bus.publish(Event('word_retired', {
            'word_key': word_key
        }))
    
    def is_word_eligible_for_play(self, word_key: str) -> bool:
        """Check if word is eligible for play (timing + retirement)"""
        progress = self.get_progress(word_key)
        
        # FR3.2: Exclude retired words
        if progress.retired:
            return False
        
        # Check timing eligibility
        return self.timing_calculator.is_time_elapsed(progress.next_allowed_time)
    
    def get_due_words(self) -> list[str]:
        """Get words due for review"""
        all_progress = self.repository.get_all_progress()
        due_words = []
        
        for word_key, progress in all_progress.items():
            if progress.retired or progress.is_mastered:
                continue
            
            if self.review_calculator.is_due_for_review(progress.next_review_date):
                due_words.append(word_key)
        
        return due_words
    
    def reset_daily_exposures(self):
        """Reset daily exposure counts"""
        all_progress = self.repository.get_all_progress()
        
        for word_key, progress in all_progress.items():
            progress.exposures_today = 0
            progress.last_exposure_time = ""
            progress.next_allowed_time = datetime.now().isoformat()
            self.repository.save_progress(word_key, progress)
        
        # Publish reset event
        event_bus.publish(Event('exposure_count_reset', {}))
    
    def _handle_word_reviewed(self, event: Event):
        """Handle word review event"""
        word_key = event.data['word_key']
        is_correct = event.data.get('is_correct', True)  # Default to correct for implicit
        
        if is_correct:
            self.handle_implicit_review(word_key)
    
    def _handle_playback_completed(self, event: Event):
        """Handle playback completion event"""
        word_key = event.data['word_key']
        self.update_word_exposure(word_key)
        self.handle_implicit_review(word_key)
    
    def _handle_date_changed(self, event: Event):
        """Handle date change event"""
        self.reset_daily_exposures()