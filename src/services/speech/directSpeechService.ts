
import { getVoiceByRegion } from '@/utils/speech/voiceUtils';

/**
 * Direct speech service with immediate cancellation and reliable state management
 */
class DirectSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;

  async speak(
    text: string, 
    options: {
      voiceRegion?: 'US' | 'UK';
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: any) => void;
    } = {}
  ): Promise<boolean> {
    console.log('[DIRECT-SPEECH] speak() called with text:', text.substring(0, 50) + '...');
    
    // Stop any existing speech immediately
    this.stop();
    
    return new Promise((resolve) => {
      try {
        // Check if speech synthesis is supported
        if (!window.speechSynthesis) {
          console.error('[DIRECT-SPEECH] Speech synthesis not supported');
          options.onError?.('Speech synthesis not supported');
          resolve(false);
          return;
        }

        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;
        this.isActive = true;

        // Enhanced voice selection with the improved voice utils
        const voice = getVoiceByRegion(options.voiceRegion || 'US', 'female');
        if (voice) {
          utterance.voice = voice;
          console.log('[DIRECT-SPEECH] Using voice:', voice.name, voice.lang);
        } else {
          console.warn('[DIRECT-SPEECH] No suitable voice found, using default');
        }

        // Configure utterance
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Set up event handlers
        utterance.onstart = () => {
          console.log('[DIRECT-SPEECH] ✓ Speech started');
          options.onStart?.();
          resolve(true);
        };

        utterance.onend = () => {
          console.log('[DIRECT-SPEECH] ✓ Speech ended normally');
          this.cleanup();
          options.onEnd?.();
        };

        utterance.onerror = (event) => {
          console.error('[DIRECT-SPEECH] ✗ Speech error:', event.error);
          this.cleanup();
          options.onError?.(event);
          // Don't resolve false here since onstart might have already resolved true
        };

        // Start speech
        console.log('[DIRECT-SPEECH] Starting speech synthesis...');
        window.speechSynthesis.speak(utterance);

        // Fallback timeout in case onstart never fires
        setTimeout(() => {
          if (this.isActive && this.currentUtterance === utterance) {
            console.log('[DIRECT-SPEECH] Fallback - assuming speech started');
            resolve(true);
          }
        }, 1000);

      } catch (error) {
        console.error('[DIRECT-SPEECH] Exception in speak():', error);
        this.cleanup();
        options.onError?.(error);
        resolve(false);
      }
    });
  }

  stop(): void {
    console.log('[DIRECT-SPEECH] stop() called');
    
    if (window.speechSynthesis) {
      // Use cancel() for immediate stop - more reliable than pause()
      window.speechSynthesis.cancel();
      console.log('[DIRECT-SPEECH] ✓ speechSynthesis.cancel() called');
    }
    
    this.cleanup();
  }

  private cleanup(): void {
    console.log('[DIRECT-SPEECH] Cleaning up speech service');
    this.currentUtterance = null;
    this.isActive = false;
  }

  isCurrentlyActive(): boolean {
    return this.isActive;
  }

  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }
}

export const directSpeechService = new DirectSpeechService();
