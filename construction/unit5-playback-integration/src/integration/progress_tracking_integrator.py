from models.button_interaction import ButtonInteractionTracker
from models.ui_integration_state import ButtonInteraction

class ProgressTrackingIntegrator:
    def __init__(self, event_bus):
        self.event_bus = event_bus
        self.tracker = ButtonInteractionTracker()
    
    def track_button_interaction(self, interaction: ButtonInteraction):
        print(f"Tracking button interaction: {interaction.button_type.value}")
        
        # Track the interaction
        timestamp = self.tracker.track_interaction(
            interaction.button_type,
            interaction.word_key
        )
        
        # Simulate progress tracking
        progress_before = self._get_current_progress(interaction.word_key)
        
        print(f"Progress before: {progress_before}")
        
        # Publish tracking event
        self._publish_tracking_event(interaction)
    
    def complete_progress_tracking(self, word_key: str):
        progress_after = self._get_current_progress(word_key)
        self.tracker.complete_tracking(word_key, progress_after)
        
        print(f"Progress tracking completed for: {word_key}")
    
    def _get_current_progress(self, word_key: str) -> dict:
        # Simulate getting progress from repository
        return {
            'word': word_key,
            'review_count': 1,
            'status': 'due',
            'last_played': '2025-08-15'
        }
    
    def _publish_tracking_event(self, interaction: ButtonInteraction):
        event_data = {
            'word_key': interaction.word_key,
            'action_type': interaction.button_type.value,
            'timestamp': interaction.timestamp,
            'success': interaction.success
        }
        
        print(f"Publishing tracking event: {event_data}")
        # Would publish to event bus in real implementation