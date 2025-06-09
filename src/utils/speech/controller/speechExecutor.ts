
import { unlockAudio, loadVoicesAndWait } from '../core/speechEngine';
import { 
  registerSpeechRequest, 
  unregisterSpeechRequest, 
  isActiveSpeechRequest 
} from '../core/speechEngine';
import { SpeechStateManager } from './speechStateManager';
import { SpeechOptions } from './types';

/**
 * Handles the actual execution of speech synthesis
 */
export class SpeechExecutor {
  constructor(private stateManager: SpeechStateManager) {}

  async execute(text: string, options: SpeechOptions = {}): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const speechId = Math.random().toString(36).substring(7);
        console.log(`[SPEECH-EXECUTOR-${speechId}] Starting speech process for text:`, text.substring(0, 50));
        
        // Check if user has paused - if so, store for later and reject
        if (this.stateManager.isPaused() && !options.allowOverride) {
          console.log(`[SPEECH-EXECUTOR-${speechId}] Speech is paused by user, storing text for resume`);
          this.stateManager.storePausedContent(text, options);
          resolve(false);
          return;
        }

        // Register this speech request for coordination
        const canProceed = registerSpeechRequest(speechId, text, options);
        if (!canProceed && !options.allowOverride) {
          console.log(`[SPEECH-EXECUTOR-${speechId}] Speech request blocked by coordination`);
          resolve(false);
          return;
        }
        
        // Ensure browser audio is unlocked and voices are available
        await unlockAudio();
        await loadVoicesAndWait();

        // Stop current speech if we're actually speaking
        if (this.stateManager.isCurrentlyActive() && window.speechSynthesis.speaking) {
          console.log(`[SPEECH-EXECUTOR-${speechId}] Stopping current speech before starting new one`);
          this.stop();
          await new Promise(r => setTimeout(r, 100));
        }
        
        // Reset state flags
        this.stateManager.setSpeechProgress(false, false);
        this.stateManager.setCurrentSpeech(null, speechId);
        this.stateManager.storePausedContent('', null);
        
        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set properties
        if (options.voice) {
          utterance.voice = options.voice;
          console.log(`[SPEECH-EXECUTOR-${speechId}] Using voice:`, options.voice.name);
        }
        utterance.rate = options.rate || 0.8;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        
        // Set up event handlers
        utterance.onstart = () => {
          console.log(`[SPEECH-EXECUTOR-${speechId}] Speech started successfully`);
          this.stateManager.setSpeechProgress(true, false);
          this.stateManager.setActive(true);
          if (options.onStart) options.onStart();
        };
        
        utterance.onend = () => {
          console.log(`[SPEECH-EXECUTOR-${speechId}] Speech ended naturally`);
          this.stateManager.setSpeechProgress(true, true);
          this.stateManager.setActive(false);
          this.stateManager.setCurrentSpeech(null, null);
          unregisterSpeechRequest(speechId);
          if (options.onEnd) options.onEnd();
          resolve(true);
        };
        
        utterance.onerror = (event) => {
          console.error(`[SPEECH-EXECUTOR-${speechId}] Speech error:`, {
            error: event.error,
            type: event.type,
            speechStarted: this.stateManager.getState().speechStarted,
            speechEnded: this.stateManager.getState().speechEnded
          });
          
          this.stateManager.setActive(false);
          this.stateManager.setCurrentSpeech(null, null);
          unregisterSpeechRequest(speechId);
          
          if (options.onError) options.onError(event);
          
          // Handle cancellation due to pause
          const state = this.stateManager.getState();
          if (event.error === 'canceled' && this.stateManager.isPaused()) {
            console.log(`[SPEECH-EXECUTOR-${speechId}] Speech canceled due to pause, treating as success`);
            resolve(true);
          } else if (event.error === 'canceled' && !state.speechStarted) {
            console.log(`[SPEECH-EXECUTOR-${speechId}] Speech was canceled before starting, treating as success`);
            resolve(true);
          } else {
            resolve(false);
          }
        };
        
        // Store reference and start speaking
        this.stateManager.setCurrentSpeech(utterance, speechId);
        
        console.log(`[SPEECH-EXECUTOR-${speechId}] Initiating speech synthesis`);
        window.speechSynthesis.speak(utterance);
        
        // Speech monitoring
        this.monitorSpeech(speechId, resolve);
        
      } catch (error) {
        console.error(`[SPEECH-EXECUTOR] Error in execute method:`, error);
        this.stateManager.setActive(false);
        this.stateManager.setCurrentSpeech(null, null);
        const currentId = this.stateManager.getCurrentSpeechId();
        if (currentId) {
          unregisterSpeechRequest(currentId);
        }
        resolve(false);
      }
    });
  }

  private monitorSpeech(speechId: string, resolve: (value: boolean) => void): void {
    let monitorAttempts = 0;
    const maxMonitorAttempts = 15;
    
    const monitor = () => {
      monitorAttempts++;
      
      // Check if speech was paused during monitoring
      if (this.stateManager.isPaused()) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Speech paused during monitoring`);
        return;
      }
      
      // Check if this speech is still the active one
      if (!isActiveSpeechRequest(speechId)) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Speech no longer active, stopping monitoring`);
        return;
      }
      
      const state = this.stateManager.getState();
      if (state.speechStarted) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Speech successfully started, monitoring complete`);
        return;
      }
      
      if (state.speechEnded) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Speech ended before monitoring complete`);
        return;
      }
      
      if (window.speechSynthesis.speaking) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Browser reports speaking, waiting for onstart event`);
        if (monitorAttempts < maxMonitorAttempts) {
          setTimeout(monitor, 100);
        }
        return;
      }
      
      if (monitorAttempts >= maxMonitorAttempts) {
        console.warn(`[SPEECH-EXECUTOR-${speechId}] Speech monitoring timeout reached`);
        if (this.stateManager.getCurrentSpeechId() === speechId) {
          this.stateManager.setActive(false);
          this.stateManager.setCurrentSpeech(null, null);
          unregisterSpeechRequest(speechId);
          resolve(false);
        }
        return;
      }
      
      setTimeout(monitor, 100);
    };
    
    setTimeout(monitor, 200);
  }

  stop(): void {
    console.log('[SPEECH-EXECUTOR] Stop requested');
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    const currentId = this.stateManager.getCurrentSpeechId();
    if (currentId) {
      unregisterSpeechRequest(currentId);
    }
  }
}
