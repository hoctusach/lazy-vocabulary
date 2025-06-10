
import { directSpeechService } from '@/services/speech/directSpeechService';

interface RecoveryState {
  consecutiveErrors: number;
  lastErrorTime: number;
  isRecovering: boolean;
  lastSuccessTime: number;
}

class SpeechRecoveryController {
  private state: RecoveryState = {
    consecutiveErrors: 0,
    lastErrorTime: 0,
    isRecovering: false,
    lastSuccessTime: Date.now()
  };

  private readonly MAX_CONSECUTIVE_ERRORS = 3; // Reduced threshold
  private readonly ERROR_RESET_TIME = 10000; // 10 seconds
  private readonly RECOVERY_DELAY = 500; // Shorter recovery delay
  private readonly SUCCESS_RESET_TIME = 5000; // Reset errors after success

  handleSpeechError(error: any): boolean {
    console.log('[SPEECH-RECOVERY] Handling speech error:', error);
    
    const now = Date.now();
    
    // Reset error count if enough time has passed since last error
    if (now - this.state.lastErrorTime > this.ERROR_RESET_TIME) {
      console.log('[SPEECH-RECOVERY] Resetting error count due to time gap');
      this.state.consecutiveErrors = 0;
    }
    
    // Reset error count if we had recent success
    if (now - this.state.lastSuccessTime < this.SUCCESS_RESET_TIME) {
      console.log('[SPEECH-RECOVERY] Recent success, resetting error count');
      this.state.consecutiveErrors = 0;
    }
    
    this.state.consecutiveErrors++;
    this.state.lastErrorTime = now;
    
    console.log(`[SPEECH-RECOVERY] Consecutive errors: ${this.state.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS}`);
    
    // Enter recovery mode if we exceed threshold
    if (this.state.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      console.log('[SPEECH-RECOVERY] Error threshold reached, entering recovery mode');
      this.enterRecoveryMode();
      return false; // Don't retry
    }
    
    return true; // Allow retry for fewer errors
  }

  private async enterRecoveryMode() {
    if (this.state.isRecovering) {
      console.log('[SPEECH-RECOVERY] Already in recovery mode');
      return;
    }
    
    this.state.isRecovering = true;
    console.log('[SPEECH-RECOVERY] Starting recovery process');
    
    try {
      // Stop current speech immediately
      directSpeechService.stop();
      
      // Brief pause for cleanup
      await new Promise(resolve => setTimeout(resolve, this.RECOVERY_DELAY));
      
      // Reset speech synthesis completely
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        console.log('[SPEECH-RECOVERY] Speech synthesis reset');
      }
      
      // Reset state
      this.state.consecutiveErrors = 0;
      this.state.isRecovering = false;
      this.state.lastSuccessTime = Date.now();
      
      console.log('[SPEECH-RECOVERY] Recovery completed successfully');
    } catch (error) {
      console.error('[SPEECH-RECOVERY] Recovery failed:', error);
      this.state.isRecovering = false;
      // Still reset errors to prevent permanent lock
      this.state.consecutiveErrors = 0;
    }
  }

  handleSpeechSuccess() {
    console.log('[SPEECH-RECOVERY] Speech success - resetting state');
    this.state.consecutiveErrors = 0;
    this.state.isRecovering = false;
    this.state.lastSuccessTime = Date.now();
  }

  isInRecoveryMode(): boolean {
    return this.state.isRecovering;
  }

  getErrorCount(): number {
    return this.state.consecutiveErrors;
  }
}

export const speechRecoveryController = new SpeechRecoveryController();
