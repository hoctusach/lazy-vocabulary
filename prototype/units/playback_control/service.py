from typing import List, Optional
from infrastructure import Event, event_bus

class PlaybackControlService:
    """Manages playback queue and timing controls"""
    
    def __init__(self):
        self._queue: List[str] = []
        self._current_index: int = 0
        self._is_playing: bool = False
        self._repeat_count: int = 1
        self._interval_seconds: float = 3.0
        
        # Subscribe to events
        event_bus.subscribe('daily_selection_updated', self._handle_daily_selection_updated)
        event_bus.subscribe('playback_control', self._handle_playback_control)
        event_bus.subscribe('timing_control', self._handle_timing_control)
    
    def get_current_word(self) -> Optional[str]:
        """Get currently playing word"""
        if 0 <= self._current_index < len(self._queue):
            return self._queue[self._current_index]
        return None
    
    def get_queue_status(self) -> dict:
        """Get current queue status"""
        return {
            'queue': self._queue.copy(),
            'current_index': self._current_index,
            'is_playing': self._is_playing,
            'repeat_count': self._repeat_count,
            'interval_seconds': self._interval_seconds,
            'total_words': len(self._queue)
        }
    
    def _handle_daily_selection_updated(self, event: Event):
        """Handle daily selection update"""
        new_words = event.data['words']
        
        # Update queue with new daily words
        self._queue = new_words.copy()
        self._current_index = 0
        
        # Publish queue updated event
        event_bus.publish(Event('playback_queue_updated', {
            'queue': self._queue,
            'current_index': self._current_index
        }))
    
    def _handle_playback_control(self, event: Event):
        """Handle playback control commands"""
        action = event.data['action']
        
        if action == 'play':
            self._is_playing = True
            self._start_playback()
        elif action == 'pause':
            self._is_playing = False
        elif action == 'next':
            self._next_word()
        elif action == 'previous':
            self._previous_word()
        elif action == 'stop':
            self._is_playing = False
            self._current_index = 0
        
        # Publish playback state updated
        event_bus.publish(Event('playback_state_updated', {
            'is_playing': self._is_playing,
            'current_index': self._current_index,
            'current_word': self.get_current_word()
        }))
    
    def _handle_timing_control(self, event: Event):
        """Handle timing control changes"""
        if 'repeat_count' in event.data:
            self._repeat_count = event.data['repeat_count']
        
        if 'interval_seconds' in event.data:
            self._interval_seconds = event.data['interval_seconds']
        
        # Publish timing updated event
        event_bus.publish(Event('timing_updated', {
            'repeat_count': self._repeat_count,
            'interval_seconds': self._interval_seconds
        }))
    
    def _start_playback(self):
        """Start playback sequence"""
        if not self._queue:
            return
        
        current_word = self.get_current_word()
        if current_word:
            # Publish word playback event
            event_bus.publish(Event('word_playback_requested', {
                'word_id': current_word,
                'repeat_count': self._repeat_count,
                'interval_seconds': self._interval_seconds
            }))
    
    def _next_word(self):
        """Move to next word in queue"""
        if self._current_index < len(self._queue) - 1:
            self._current_index += 1
        else:
            self._current_index = 0  # Loop back to beginning
        
        if self._is_playing:
            self._start_playback()
    
    def _previous_word(self):
        """Move to previous word in queue"""
        if self._current_index > 0:
            self._current_index -= 1
        else:
            self._current_index = len(self._queue) - 1  # Loop to end
        
        if self._is_playing:
            self._start_playback()
    
    def simulate_word_completed(self):
        """Simulate word playback completion (for demo)"""
        if self._is_playing:
            # Auto-advance to next word
            self._next_word()