
import { unlockAudio, loadVoicesAndWait } from './core/speechEngine';

/**
 * Simplified speech controller for reliable audio playback
 */
class SimpleSpeechController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;

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
        // Ensure browser audio is unlocked and voices are available
        await unlockAudio();
        await loadVoicesAndWait();

        // Stop any current speech and wait briefly for the cancel
        this.stop();

        // Allow the cancel operation to fully propagate
        await new Promise(r => setTimeout(r, 50));
        
        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set properties
        if (options.voice) utterance.voice = options.voice;
        utterance.rate = options.rate || 0.8;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        
        // Set up event handlers
        utterance.onstart = () => {
          console.log('SimpleSpeechController: Speech started');
          this.isActive = true;
          if (options.onStart) options.onStart();
        };
        
        utterance.onend = () => {
          console.log('SimpleSpeechController: Speech ended');
          this.isActive = false;
          this.currentUtterance = null;
          if (options.onEnd) options.onEnd();
          resolve(true);
        };
        
        utterance.onerror = (event) => {
          console.error('SimpleSpeechController: Speech error:', event);
          this.isActive = false;
          this.currentUtterance = null;
          if (options.onError) options.onError(event);
          resolve(false);
        };
        
        // Store reference and start speaking
        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
        
        // Check if speech started within reasonable time
        setTimeout(() => {
          if (!window.speechSynthesis.speaking && this.currentUtterance === utterance) {
            console.warn('SimpleSpeechController: Speech may have failed silently');
            this.isActive = false;
            this.currentUtterance = null;
            resolve(false);
          }
        }, 500);
        
      } catch (error) {
        console.error('SimpleSpeechController: Error starting speech:', error);
        this.isActive = false;
        this.currentUtterance = null;
        resolve(false);
      }
    });
  }

  stop(): void {
    console.log('SimpleSpeechController: Stopping speech');
    console.log('SimpleSpeechController: Current state before stop', {
      isActive: this.isActive,
      speaking: window.speechSynthesis?.speaking,
      paused: window.speechSynthesis?.paused
    });
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isActive = false;
    this.currentUtterance = null;
  }

  pause(): void {
    if (window.speechSynthesis && this.isActive) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }

  getState() {
    return {
      isActive: this.isActive,
      isPaused: window.speechSynthesis?.paused || false,
      currentUtterance: this.currentUtterance
    };
  }
}

export const simpleSpeechController = new SimpleSpeechController();
