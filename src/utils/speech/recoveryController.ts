
import { directSpeechService } from '@/services/speech/directSpeechService';

interface RecoveryState {
  consecutiveErrors: number;
  lastErrorTime: number;
  isRecovering: boolean;
}

class SpeechRecoveryController {
  private state: RecoveryState = {
    consecutiveErrors: 0,
    lastErrorTime: 0,
    isRecovering: false
  };

  private readonly MAX_CONSECUTIVE_ERRORS = 5; // Increased threshold
  private readonly ERROR_RESET_TIME = 15000; // Longer reset time
  private readonly RECOVERY_DELAY = 1000; // Shorter recovery delay

  handleSpeechError(error: any): boolean {
    console.log('[SPEECH-RECOVERY] Handling speech error:', error);
    
    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.state.lastErrorTime > this.ERROR_RESET_TIME) {
      this.state.consecutiveErrors = 0;
    }
    
    this.state.consecutiveErrors++;
    this.state.lastErrorTime = now;
    
    console.log(`[SPEECH-RECOVERY] Consecutive errors: ${this.state.consecutiveErrors}`);
    
    // Only enter recovery mode after many errors
    if (this.state.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      console.log('[SPEECH-RECOVERY] Entering recovery mode');
      this.enterRecoveryMode();
      return false;
    }
    
    return true; // Allow retry for fewer errors
  }

  private async enterRecoveryMode() {
    if (this.state.isRecovering) return;
    
    this.state.isRecovering = true;
    console.log('[SPEECH-RECOVERY] Starting recovery process');
    
    try {
      // Stop current speech
      directSpeechService.stop();
      
      // Shorter recovery delay
      await new Promise(resolve => setTimeout(resolve, this.RECOVERY_DELAY));
      
      // Reset speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Reset state
      this.state.consecutiveErrors = 0;
      this.state.isRecovering = false;
      
      console.log('[SPEECH-RECOVERY] Recovery completed');
    } catch (error) {
      console.error('[SPEECH-RECOVERY] Recovery failed:', error);
      this.state.isRecovering = false;
    }
  }

  handleSpeechSuccess() {
    console.log('[SPEECH-RECOVERY] Speech success - resetting error count');
    this.state.consecutiveErrors = 0;
    this.state.isRecovering = false;
  }

  isInRecoveryMode(): boolean {
    return this.state.isRecovering;
  }

  getErrorCount(): number {
    return this.state.consecutiveErrors;
  }
}

export const speechRecoveryController = new SpeechRecoveryController();
