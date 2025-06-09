
import { SpeechStateManager } from './speechStateManager';

/**
 * Handles pause and resume functionality with immediate cancellation
 */
export class PauseResumeHandler {
  constructor(private stateManager: SpeechStateManager) {}

  pause(): void {
    console.log('[PAUSE-HANDLER] Pause requested - implementing immediate cancellation');
    
    // Set pause state immediately for all components to see
    this.stateManager.setPauseState(true);
    
    // If currently speaking, store content and cancel immediately
    const state = this.stateManager.getState();
    if (state.isActive && window.speechSynthesis.speaking) {
      console.log('[PAUSE-HANDLER] Speech active - storing content and cancelling immediately');
      
      // Store current speech for resume
      if (state.currentUtterance) {
        this.stateManager.storePausedContent(
          state.currentUtterance.text,
          {} // Store basic info for resume
        );
        console.log('[PAUSE-HANDLER] Stored content for resume:', state.currentUtterance.text.substring(0, 50));
      }
      
      // Cancel immediately - no delay, no attempts at pause()
      console.log('[PAUSE-HANDLER] Cancelling speech immediately');
      window.speechSynthesis.cancel();
      
      // Update state to reflect cancellation
      this.stateManager.setActive(false);
      this.stateManager.setCurrentSpeech(null, null);
    } else {
      console.log('[PAUSE-HANDLER] No active speech to cancel');
    }
  }

  resume(): void {
    console.log('[PAUSE-HANDLER] Resume requested');
    
    // Clear pause state immediately
    this.stateManager.setPauseState(false);
    
    // Clear any browser pause state if it exists
    if (window.speechSynthesis.paused) {
      console.log('[PAUSE-HANDLER] Clearing browser pause state');
      window.speechSynthesis.resume();
    }
    
    console.log('[PAUSE-HANDLER] Resume complete - playback should restart with current word');
  }
}
