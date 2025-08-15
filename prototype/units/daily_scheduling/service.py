from datetime import datetime, date
from typing import List, Dict, Set
from infrastructure import Event, event_bus, local_storage

class DailySchedulingService:
    """Manages daily word selection and scheduling"""
    
    DAILY_SELECTION_KEY = 'dailySelection'
    LAST_SELECTION_DATE_KEY = 'lastSelectionDate'
    
    def __init__(self):
        self._daily_words: List[str] = []
        self._last_selection_date: date = None
        self._load_daily_selection()
        
        # Subscribe to events
        event_bus.subscribe('progress_updated', self._handle_progress_updated)
        event_bus.subscribe('app_started', self._handle_app_started)
    
    def _load_daily_selection(self):
        """Load daily selection from storage"""
        self._daily_words = local_storage.get_json(self.DAILY_SELECTION_KEY, [])
        
        date_str = local_storage.get_item(self.LAST_SELECTION_DATE_KEY)
        if date_str:
            self._last_selection_date = date.fromisoformat(date_str)
    
    def _save_daily_selection(self):
        """Save daily selection to storage"""
        local_storage.set_json(self.DAILY_SELECTION_KEY, self._daily_words)
        if self._last_selection_date:
            local_storage.set_item(self.LAST_SELECTION_DATE_KEY, self._last_selection_date.isoformat())
    
    def get_daily_words(self) -> List[str]:
        """Get today's selected words"""
        self._ensure_daily_selection()
        return self._daily_words.copy()
    
    def _ensure_daily_selection(self):
        """Ensure daily selection is current"""
        today = date.today()
        
        if self._last_selection_date != today:
            self._generate_daily_selection()
            self._last_selection_date = today
            self._save_daily_selection()
            
            # Publish daily selection updated event
            event_bus.publish(Event('daily_selection_updated', {
                'words': self._daily_words,
                'date': today.isoformat()
            }))
    
    def _generate_daily_selection(self):
        """Generate new daily word selection"""
        # Request due words from learning progress
        event_bus.publish(Event('request_due_words', {}))
        
        # For now, use a simple selection (will be enhanced when integrated)
        # This would normally wait for the response event
        self._daily_words = []  # Will be populated by event response
    
    def _handle_progress_updated(self, event: Event):
        """Handle progress update to potentially adjust daily selection"""
        word_id = event.data['word_id']
        progress = event.data['progress']
        
        # If a word becomes due, consider adding to today's selection
        if progress.next_review_date and progress.next_review_date.date() <= date.today():
            if word_id not in self._daily_words:
                self._daily_words.append(word_id)
                self._save_daily_selection()
    
    def _handle_app_started(self, event: Event):
        """Handle app startup to ensure daily selection is ready"""
        self._ensure_daily_selection()
    
    def set_daily_words(self, word_ids: List[str]):
        """Set daily words (used by integration layer)"""
        self._daily_words = word_ids
        self._last_selection_date = date.today()
        self._save_daily_selection()
        
        event_bus.publish(Event('daily_selection_updated', {
            'words': self._daily_words,
            'date': date.today().isoformat()
        }))