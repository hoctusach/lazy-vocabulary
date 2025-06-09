
import { unlockAudio, loadVoicesAndWait } from './core/speechEngine';
import { 
  registerSpeechRequest, 
  unregisterSpeechRequest, 
  isActiveSpeechRequest,
  clearAllSpeechRequests 
} from './core/modules/speechCoordination';

/**
 * Simplified speech controller with improved coordination and pause handling
 */
class SimpleSpeechController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentSpeechId: string | null = null;
  private isActive = false;
  private speechStarted = false;
  private speechEnded = false;
  private isPausedByUser = false;

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
        
        // Check if user has paused
        if (this.isPausedByUser && !options.allowOverride) {
          console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech is paused by user, skipping`);
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

        // Only stop current speech if we're actually speaking and this isn't a pause override
        if (this.isActive && window.speechSynthesis.speaking && !options.allowOverride) {
          console.log(`[SIMPLE-CONTROLLER-${speechId}] Stopping current speech before starting new one`);
          this.stop();
          await new Promise(r => setTimeout(r, 100));
        }
        
        // Reset state flags
        this.speechStarted = false;
        this.speechEnded = false;
        this.currentSpeechId = speechId;
        
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
        
        // Set up event handlers with enhanced logging
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
          
          // Handle cancellation differently when paused
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
        
        // Enhanced speech monitoring
        let monitorAttempts = 0;
        const maxMonitorAttempts = 15;
        
        const monitorSpeech = () => {
          monitorAttempts++;
          
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

          if (this.isPausedByUser) {
            console.log(`[SIMPLE-CONTROLLER-${speechId}] Speech paused by user during monitoring`);
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
  }

  pause(): void {
    console.log('[SIMPLE-CONTROLLER] Pause requested');
    this.isPausedByUser = true;
    
    if (window.speechSynthesis && this.isActive) {
      window.speechSynthesis.cancel();
    }
  }

  resume(): void {
    console.log('[SIMPLE-CONTROLLER] Resume requested');
    this.isPausedByUser = false;
    
    // Note: Resume will be handled by the calling code re-initiating speech
  }

  isPaused(): boolean {
    return this.isPausedByUser;
  }

  getState() {
    return {
      isActive: this.isActive,
      isPaused: this.isPausedByUser,
      currentUtterance: this.currentUtterance,
      speechStarted: this.speechStarted,
      speechEnded: this.speechEnded,
      currentSpeechId: this.currentSpeechId
    };
  }
}

export const simpleSpeechController = new SimpleSpeechController();
