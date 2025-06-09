
import { unlockAudio, loadVoicesAndWait } from './core/speechEngine';

/**
 * Simplified speech controller for reliable audio playback
 */
class SimpleSpeechController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;
  private speechStarted = false;
  private speechEnded = false;

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
    } = {}
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        console.log('[SIMPLE-CONTROLLER] Starting speech process for text:', text.substring(0, 50));
        
        // Ensure browser audio is unlocked and voices are available
        await unlockAudio();
        await loadVoicesAndWait();

        // Only stop current speech if we're actually speaking
        if (this.isActive && window.speechSynthesis.speaking) {
          console.log('[SIMPLE-CONTROLLER] Stopping current speech before starting new one');
          this.stop();
          // Wait for the cancel operation to complete
          await new Promise(r => setTimeout(r, 100));
        }
        
        // Reset state flags
        this.speechStarted = false;
        this.speechEnded = false;
        
        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set properties
        if (options.voice) {
          utterance.voice = options.voice;
          console.log('[SIMPLE-CONTROLLER] Using voice:', options.voice.name);
        }
        utterance.rate = options.rate || 0.8;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        
        // Set up event handlers with enhanced logging
        utterance.onstart = () => {
          console.log('[SIMPLE-CONTROLLER] Speech started successfully');
          this.speechStarted = true;
          this.isActive = true;
          if (options.onStart) options.onStart();
        };
        
        utterance.onend = () => {
          console.log('[SIMPLE-CONTROLLER] Speech ended naturally');
          this.speechEnded = true;
          this.isActive = false;
          this.currentUtterance = null;
          if (options.onEnd) options.onEnd();
          resolve(true);
        };
        
        utterance.onerror = (event) => {
          console.error('[SIMPLE-CONTROLLER] Speech error details:', {
            error: event.error,
            type: event.type,
            isTrusted: event.isTrusted,
            speechStarted: this.speechStarted,
            speechEnded: this.speechEnded
          });
          
          // Don't treat cancellation as an error if speech hadn't started yet
          if (event.error === 'canceled' && !this.speechStarted) {
            console.log('[SIMPLE-CONTROLLER] Speech was canceled before starting, treating as success');
            this.isActive = false;
            this.currentUtterance = null;
            resolve(true);
            return;
          }
          
          // Handle other error types
          this.isActive = false;
          this.currentUtterance = null;
          if (options.onError) options.onError(event);
          
          // For interrupted speech, still consider it a partial success
          if (event.error === 'interrupted' && this.speechStarted) {
            console.log('[SIMPLE-CONTROLLER] Speech was interrupted but had started, treating as partial success');
            resolve(true);
          } else {
            resolve(false);
          }
        };
        
        // Store reference and start speaking
        this.currentUtterance = utterance;
        
        console.log('[SIMPLE-CONTROLLER] Initiating speech synthesis');
        window.speechSynthesis.speak(utterance);
        
        // Enhanced speech monitoring with longer timeout
        let monitorAttempts = 0;
        const maxMonitorAttempts = 10;
        
        const monitorSpeech = () => {
          monitorAttempts++;
          
          if (this.speechStarted) {
            console.log('[SIMPLE-CONTROLLER] Speech successfully started, monitoring complete');
            return;
          }
          
          if (this.speechEnded) {
            console.log('[SIMPLE-CONTROLLER] Speech ended before we could monitor start');
            return;
          }
          
          if (window.speechSynthesis.speaking) {
            console.log('[SIMPLE-CONTROLLER] Browser reports speaking, waiting for onstart event');
            if (monitorAttempts < maxMonitorAttempts) {
              setTimeout(monitorSpeech, 100);
            }
            return;
          }
          
          if (monitorAttempts >= maxMonitorAttempts) {
            console.warn('[SIMPLE-CONTROLLER] Speech monitoring timeout reached');
            if (this.currentUtterance === utterance) {
              this.isActive = false;
              this.currentUtterance = null;
              resolve(false);
            }
            return;
          }
          
          // Continue monitoring
          setTimeout(monitorSpeech, 100);
        };
        
        // Start monitoring after a short delay
        setTimeout(monitorSpeech, 200);
        
      } catch (error) {
        console.error('[SIMPLE-CONTROLLER] Error in speak method:', error);
        this.isActive = false;
        this.currentUtterance = null;
        resolve(false);
      }
    });
  }

  stop(): void {
    console.log('[SIMPLE-CONTROLLER] Stop requested, current state:', {
      isActive: this.isActive,
      hasCurrent: !!this.currentUtterance,
      browserSpeaking: window.speechSynthesis?.speaking,
      browserPaused: window.speechSynthesis?.paused
    });
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    this.isActive = false;
    this.currentUtterance = null;
    this.speechStarted = false;
    this.speechEnded = false;
  }

  pause(): void {
    if (window.speechSynthesis && this.isActive) {
      console.log('[SIMPLE-CONTROLLER] Pausing speech');
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (window.speechSynthesis) {
      console.log('[SIMPLE-CONTROLLER] Resuming speech');
      window.speechSynthesis.resume();
    }
  }

  getState() {
    return {
      isActive: this.isActive,
      isPaused: window.speechSynthesis?.paused || false,
      currentUtterance: this.currentUtterance,
      speechStarted: this.speechStarted,
      speechEnded: this.speechEnded
    };
  }
}

export const simpleSpeechController = new SimpleSpeechController();
