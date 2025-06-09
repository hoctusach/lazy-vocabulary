
import { SpeechStateManager } from './speechStateManager';

/**
 * Handles pause and resume functionality for speech synthesis
 */
export class PauseResumeHandler {
  constructor(private stateManager: SpeechStateManager) {}

  pause(): void {
    console.log('[PAUSE-HANDLER] Pause requested');
    this.stateManager.setPauseState(true);
    
    // If currently speaking, try to pause properly first
    const state = this.stateManager.getState();
    if (state.isActive && window.speechSynthesis.speaking) {
      console.log('[PAUSE-HANDLER] Attempting to pause current speech');
      
      // Store current speech for potential resume
      if (state.currentUtterance) {
        this.stateManager.storePausedContent(
          state.currentUtterance.text,
          {} // Note: We can't store the full options, but we can store basic info
        );
      }
      
      // Try to pause first, then cancel if needed
      try {
        window.speechSynthesis.pause();
        
        // Check if pause worked after a short delay
        setTimeout(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            console.log('[PAUSE-HANDLER] Pause failed, canceling speech');
            window.speechSynthesis.cancel();
          }
        }, 100);
      } catch (error) {
        console.log('[PAUSE-HANDLER] Pause failed, canceling speech:', error);
        window.speechSynthesis.cancel();
      }
    }
  }

  resume(): void {
    console.log('[PAUSE-HANDLER] Resume requested');
    
    // Check if speech synthesis is paused and try to resume
    if (window.speechSynthesis.paused) {
      console.log('[PAUSE-HANDLER] Resuming paused speech');
      window.speechSynthesis.resume();
    }
    
    this.stateManager.setPauseState(false);
    
    // If we had stored text for resume, the calling code will handle re-speaking it
  }
}
