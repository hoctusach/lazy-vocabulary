from datetime import datetime, timedelta
from models.learning_progress import LearningProgress, LearningStatus
from models.events import ProgressUpdatedEvent
from repositories.learning_progress_repository import LearningProgressRepository

class ProgressUpdateCoordinator:
    def __init__(self, event_bus):
        self.event_bus = event_bus
        self.progress_repo = LearningProgressRepository()
    
    def update_word_progress(self, word_key: str, action_type: str):
        progress_before = self.progress_repo.get(word_key)
        
        if not progress_before:
            return
        
        # Update based on action type
        if action_type == 'COMPLETION':
            self._update_completion(progress_before)
        elif action_type in ['MANUAL_ADVANCE', 'AUTO_ADVANCE']:
            self._update_exposure(progress_before)
        
        # Save updated progress
        self.progress_repo.save(word_key, progress_before)
        
        # Publish progress update event
        self.event_bus.publish(ProgressUpdatedEvent({
            'word_key': word_key,
            'progress_data': progress_before.to_dict(),
            'timestamp': datetime.now().isoformat()
        }))
    
    def retire_word(self, word_key: str):
        progress = self.progress_repo.get(word_key)
        if progress:
            today = datetime.now().strftime('%Y-%m-%d')
            progress.status = LearningStatus.RETIRED
            progress.retired_date = today
            progress.next_review_date = self._add_days(today, 100)
            
            self.progress_repo.save(word_key, progress)
            print(f'Word {word_key} retired until {progress.next_review_date}')
    
    def _update_completion(self, progress: LearningProgress):
        today = datetime.now().strftime('%Y-%m-%d')
        progress.last_played_date = today
        progress.is_learned = True
        progress.review_count += 1
        progress.next_review_date = self._calculate_next_review_date(progress.review_count)
        progress.status = LearningStatus.DUE
    
    def _update_exposure(self, progress: LearningProgress):
        today = datetime.now().strftime('%Y-%m-%d')
        progress.last_played_date = today
    
    def _calculate_next_review_date(self, review_count: int) -> str:
        today = datetime.now()
        if review_count == 1:
            return (today + timedelta(days=1)).strftime('%Y-%m-%d')
        elif review_count == 2:
            return (today + timedelta(days=2)).strftime('%Y-%m-%d')
        elif review_count == 3:
            return (today + timedelta(days=4)).strftime('%Y-%m-%d')
        else:
            return (today + timedelta(days=7)).strftime('%Y-%m-%d')
    
    def _add_days(self, date_str: str, days: int) -> str:
        date = datetime.strptime(date_str, '%Y-%m-%d')
        return (date + timedelta(days=days)).strftime('%Y-%m-%d')