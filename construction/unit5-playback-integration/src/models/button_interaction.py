from dataclasses import dataclass
from datetime import datetime
from .ui_integration_state import ButtonType

@dataclass
class InteractionTracking:
    word_key: str
    action_type: str
    timestamp: str
    progress_before: dict
    progress_after: dict = None

class ButtonInteractionTracker:
    def __init__(self):
        self.pending_tracking = {}
    
    def track_interaction(self, button_type: ButtonType, word_key: str) -> str:
        timestamp = datetime.now().isoformat()
        
        tracking = InteractionTracking(
            word_key=word_key,
            action_type=self._map_button_to_action(button_type),
            timestamp=timestamp,
            progress_before={}  # Would get from progress service
        )
        
        self.pending_tracking[word_key] = tracking
        return timestamp
    
    def complete_tracking(self, word_key: str, progress_after: dict):
        if word_key in self.pending_tracking:
            self.pending_tracking[word_key].progress_after = progress_after
            print(f"Completed tracking for {word_key}")
            del self.pending_tracking[word_key]
    
    def _map_button_to_action(self, button_type: ButtonType) -> str:
        mapping = {
            ButtonType.NEXT: 'MANUAL_ADVANCE',
            ButtonType.RETIRE: 'RETIREMENT',
            ButtonType.PAUSE: 'PAUSE',
            ButtonType.PLAY: 'RESUME'
        }
        return mapping.get(button_type, 'COMPLETION')