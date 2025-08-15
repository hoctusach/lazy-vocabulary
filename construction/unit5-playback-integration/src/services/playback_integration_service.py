from datetime import datetime
from models.ui_integration_state import UIIntegrationState, ButtonInteraction, ButtonType

class PlaybackIntegrationService:
    def __init__(self, event_bus):
        self.event_bus = event_bus
        self.state = UIIntegrationState()
    
    def connect_with_vocabulary_card(self):
        self.state.integration_active = True
        print("Connected with VocabularyCard - integration active")
    
    def handle_next_click(self) -> ButtonInteraction:
        interaction = ButtonInteraction(
            button_type=ButtonType.NEXT,
            timestamp=datetime.now().isoformat(),
            word_key=self.state.current_word.get('word', '') if self.state.current_word else '',
            resulting_action='',
            success=False
        )
        
        try:
            # Simulate original next handler
            print("Calling original next handler...")
            
            # Integrate with queue system
            can_advance = self._check_can_advance()
            
            if can_advance:
                interaction.resulting_action = 'ADVANCED_TO_NEXT'
                interaction.success = True
                print("Advanced to next word")
            else:
                interaction.resulting_action = 'BLOCKED_SPACING_RULE'
                interaction.success = False
                print("Advance blocked by spacing rule")
                
        except Exception as e:
            interaction.resulting_action = 'ERROR'
            print(f"Next button error: {e}")
        
        return interaction
    
    def handle_retire_click(self, word_key: str) -> ButtonInteraction:
        interaction = ButtonInteraction(
            button_type=ButtonType.RETIRE,
            timestamp=datetime.now().isoformat(),
            word_key=word_key,
            resulting_action='',
            success=False
        )
        
        try:
            # Update word status to retired
            print(f"Retiring word: {word_key}")
            
            # Remove from current daily selection
            print("Removing from daily selection...")
            
            # Advance to next word if current was retired
            if self.state.current_word and self.state.current_word.get('word') == word_key:
                print("Advancing to next word after retirement")
            
            interaction.resulting_action = 'WORD_RETIRED'
            interaction.success = True
            
        except Exception as e:
            interaction.resulting_action = 'ERROR'
            print(f"Retire button error: {e}")
        
        return interaction
    
    def handle_pause_play_click(self, is_paused: bool) -> ButtonInteraction:
        button_type = ButtonType.PLAY if is_paused else ButtonType.PAUSE
        
        interaction = ButtonInteraction(
            button_type=button_type,
            timestamp=datetime.now().isoformat(),
            word_key=self.state.current_word.get('word', '') if self.state.current_word else '',
            resulting_action='',
            success=False
        )
        
        try:
            # Call original pause/play handler
            print(f"{'Resuming' if is_paused else 'Pausing'} playback...")
            
            # Update integration state
            self.state.is_paused = not is_paused
            self.state.is_audio_playing = is_paused
            self.state.auto_advance_enabled = not self.state.is_paused
            
            interaction.resulting_action = 'RESUMED' if is_paused else 'PAUSED'
            interaction.success = True
            
        except Exception as e:
            interaction.resulting_action = 'ERROR'
            print(f"Pause/Play error: {e}")
        
        return interaction
    
    def _check_can_advance(self) -> bool:
        # Simulate spacing rule check
        return True  # Simplified for demo