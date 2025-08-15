from models.events import DomainEvent

class EventHandlers:
    def __init__(self):
        pass
    
    def handle_app_started(self, event: DomainEvent):
        print(f'App started at {event.timestamp}')
        print(f'Is first load: {event.data.get("is_first_load", False)}')
    
    def handle_date_changed(self, event: DomainEvent):
        print(f'Date changed from {event.data.get("previous_date")} to {event.data.get("current_date")}')
        # Trigger daily reset and regeneration
        self._handle_date_change_actions(event.data)
    
    def handle_progress_updated(self, event: DomainEvent):
        word_key = event.data.get('word_key')
        print(f'Progress updated for word: {word_key}')
    
    def handle_stats_refreshed(self, event: DomainEvent):
        print(f'Stats refreshed - Total: {event.data.get("total_words", 0)}, '
              f'Learned: {event.data.get("learned_words", 0)}, '
              f'New: {event.data.get("new_words", 0)}, '
              f'Due: {event.data.get("due_words", 0)}')
    
    def _handle_date_change_actions(self, data):
        print('Executing date change actions:')
        print('1. Reset daily exposure counts')
        print('2. Generate new daily selection')
        print('3. Reinitialize playback queue')
        print('4. Refresh progress statistics')