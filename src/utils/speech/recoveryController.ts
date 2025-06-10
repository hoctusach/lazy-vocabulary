
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

  private readonly MAX_CONSECUTIVE_ERRORS = 3;
  private readonly ERROR_RESET_TIME = 10000; // 10 seconds
  private readonly RECOVERY_DELAY = 2000; // 2 seconds

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
    
    // If too many errors, enter recovery mode
    if (this.state.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      console.log('[SPEECH-RECOVERY] Entering recovery mode');
      this.enterRecoveryMode();
      return false; // Don't retry
    }
    
    return true; // Allow retry
  }

  private async enterRecoveryMode() {
    if (this.state.isRecovering) return;
    
    this.state.isRecovering = true;
    console.log('[SPEECH-RECOVERY] Starting recovery process');
    
    try {
      // Stop all current speech
      directSpeechService.stop();
      
      // Wait for recovery delay
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
