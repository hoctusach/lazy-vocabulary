
import { unlockAudio, loadVoicesAndWait } from './core/speechEngine';
import { 
  registerSpeechRequest, 
  unregisterSpeechRequest, 
  isActiveSpeechRequest,
  clearAllSpeechRequests 
} from './core/modules/speechCoordination';

/**
 * Simplified speech controller with proper pause/resume functionality
 */
class SimpleSpeechController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentSpeechId: string | null = null;
  private isActive = false;
  private speechStarted = false;
  private speechEnded = false;
  private isPausedByUser = false;
  private pausedText: string | null = null;
  private pausedOptions: any = null;

  async speak(
    text: string,
    options: {
      voice?: SpeechSynthesisVoice | null;
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: SpeechSynthesisErrorEvent) => void;
      allowOverride?: boolean;
    } = {}
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const speechId = Math.random().toString(36).substring(7);
        console.log(`[SIMPLE-CONTROLLER-${speechId}] Starting speech process for text:`, text.substring(0, 50));
        
        // Check if user has paused - if so, store for later and reject
        if (this.isPausedByUser && !options.allowOverride) {
          console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech is paused by user, storing text for resume`);
          this.pausedText = text;
          this.pausedOptions = options;
          resolve(false);
          return;
        }

        // Register this speech request for coordination
        const canProceed = registerSpeechRequest(speechId, text, options);
        if (!canProceed && !options.allowOverride) {
          console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech request blocked by coordination`);
          resolve(false);
          return;
        }
        
        // Ensure browser audio is unlocked and voices are available
        await unlockAudio();
        await loadVoicesAndWait();

        // Stop current speech if we're actually speaking
        if (this.isActive && window.speechSynthesis.speaking) {
          console.log(`[SIMPLE-CONTROLLER-${speechId}] Stopping current speech before starting new one`);
          this.stop();
          await new Promise(r => setTimeout(r, 100));
        }
        
        // Reset state flags
        this.speechStarted = false;
        this.speechEnded = false;
        this.currentSpeechId = speechId;
        this.pausedText = null;
        this.pausedOptions = null;
        
        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set properties
        if (options.voice) {
          utterance.voice = options.voice;
          console.log(`[SIMPLE-CONTROLLER-${speechId}] Using voice:`, options.voice.name);
        }
        utterance.rate = options.rate || 0.8;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        
        // Set up event handlers
        utterance.onstart = () => {
          console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech started successfully`);
          this.speechStarted = true;
          this.isActive = true;
          if (options.onStart) options.onStart();
        };
        
        utterance.onend = () => {
          console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech ended naturally`);
          this.speechEnded = true;
          this.isActive = false;
          this.currentUtterance = null;
          this.currentSpeechId = null;
          unregisterSpeechRequest(speechId);
          if (options.onEnd) options.onEnd();
          resolve(true);
        };
        
        utterance.onerror = (event) => {
          console.error(`[SIMPLE-CONTROLLER-${speechId}] Speech error:`, {
            error: event.error,
            type: event.type,
            speechStarted: this.speechStarted,
            speechEnded: this.speechEnded
          });
          
          this.isActive = false;
          this.currentUtterance = null;
          this.currentSpeechId = null;
          unregisterSpeechRequest(speechId);
          
          if (options.onError) options.onError(event);
          
          // Handle cancellation due to pause
          if (event.error === 'canceled' && this.isPausedByUser) {
            console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech canceled due to pause, treating as success`);
            resolve(true);
          } else if (event.error === 'canceled' && !this.speechStarted) {
            console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech was canceled before starting, treating as success`);
            resolve(true);
          } else {
            resolve(false);
          }
        };
        
        // Store reference and start speaking
        this.currentUtterance = utterance;
        
        console.log(`[SIMPLE-CONTROLLER-${speechId}] Initiating speech synthesis`);
        window.speechSynthesis.speak(utterance);
        
        // Speech monitoring
        let monitorAttempts = 0;
        const maxMonitorAttempts = 15;
        
        const monitorSpeech = () => {
          monitorAttempts++;
          
          // Check if speech was paused during monitoring
          if (this.isPausedByUser) {
            console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech paused during monitoring`);
            return;
          }
          
          // Check if this speech is still the active one
          if (!isActiveSpeechRequest(speechId)) {
            console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech no longer active, stopping monitoring`);
            return;
          }
          
          if (this.speechStarted) {
            console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech successfully started, monitoring complete`);
            return;
          }
          
          if (this.speechEnded) {
            console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech ended before monitoring complete`);
            return;
          }
          
          if (window.speechSynthesis.speaking) {
            console.log(`[SIMPLE-CONTROLLER-${speechId}] Browser reports speaking, waiting for onstart event`);
            if (monitorAttempts < maxMonitorAttempts) {
              setTimeout(monitorSpeech, 100);
            }
            return;
          }
          
          if (monitorAttempts >= maxMonitorAttempts) {
            console.warn(`[SIMPLE-CONTROLLER-${speechId}] Speech monitoring timeout reached`);
            if (this.currentSpeechId === speechId) {
              this.isActive = false;
              this.currentUtterance = null;
              this.currentSpeechId = null;
              unregisterSpeechRequest(speechId);
              resolve(false);
            }
            return;
          }
          
          setTimeout(monitorSpeech, 100);
        };
        
        setTimeout(monitorSpeech, 200);
        
      } catch (error) {
        console.error(`[SIMPLE-CONTROLLER] Error in speak method:`, error);
        this.isActive = false;
        this.currentUtterance = null;
        this.currentSpeechId = null;
        if (this.currentSpeechId) {
          unregisterSpeechRequest(this.currentSpeechId);
        }
        resolve(false);
      }
    });
  }

  stop(): void {
    console.log('[SIMPLE-CONTROLLER] Stop requested');
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (this.currentSpeechId) {
      unregisterSpeechRequest(this.currentSpeechId);
    }
    
    clearAllSpeechRequests();
    this.isActive = false;
    this.currentUtterance = null;
    this.currentSpeechId = null;
    this.speechStarted = false;
    this.speechEnded = false;
    this.isPausedByUser = false;
    this.pausedText = null;
    this.pausedOptions = null;
  }

  pause(): void {
    console.log('[SIMPLE-CONTROLLER] Pause requested');
    this.isPausedByUser = true;
    
    // If currently speaking, try to pause properly first
    if (this.isActive && window.speechSynthesis.speaking) {
      console.log('[SIMPLE-CONTROLLER] Attempting to pause current speech');
      
      // Store current speech for potential resume
      if (this.currentUtterance) {
        this.pausedText = this.currentUtterance.text;
        // Note: We can't store the full options, but we can store basic info
      }
      
      // Try to pause first, then cancel if needed
      try {
        window.speechSynthesis.pause();
        
        // Check if pause worked after a short delay
        setTimeout(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            console.log('[SIMPLE-CONTROLLER] Pause failed, canceling speech');
            window.speechSynthesis.cancel();
          }
        }, 100);
      } catch (error) {
        console.log('[SIMPLE-CONTROLLER] Pause failed, canceling speech:', error);
        window.speechSynthesis.cancel();
      }
    }
  }

  resume(): void {
    console.log('[SIMPLE-CONTROLLER] Resume requested');
    
    // Check if speech synthesis is paused and try to resume
    if (window.speechSynthesis.paused) {
      console.log('[SIMPLE-CONTROLLER] Resuming paused speech');
      window.speechSynthesis.resume();
    }
    
    this.isPausedByUser = false;
    
    // If we had stored text for resume, the calling code will handle re-speaking it
  }

  isPaused(): boolean {
    return this.isPausedByUser;
  }

  getPausedContent(): { text: string | null; options: any } {
    return {
      text: this.pausedText,
      options: this.pausedOptions
    };
  }

  getState() {
    return {
      isActive: this.isActive,
      isPaused: this.isPausedByUser,
      currentUtterance: this.currentUtterance,
      speechStarted: this.speechStarted,
      speechEnded: this.speechEnded,
      currentSpeechId: this.currentSpeechId,
      pausedText: this.pausedText
    };
  }
}

export const simpleSpeechController = new SimpleSpeechController();
