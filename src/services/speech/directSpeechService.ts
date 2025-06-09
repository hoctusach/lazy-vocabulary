
import { getVoiceByRegion } from '@/utils/speech/voiceUtils';

/**
 * Enhanced direct speech service with region-specific settings and proper text formatting
 */
class DirectSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;

  // Region-specific speech settings
  private getRegionSettings(region: 'US' | 'UK') {
    return {
      US: {
        rate: 0.7, // Slower for US voices
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: 800 // Longer pauses for US
      },
      UK: {
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: 600
      }
    }[region];
  }

  // Format text with proper breaks between segments
  private formatTextWithBreaks(word: string, meaning: string, example: string, region: 'US' | 'UK'): string {
    const settings = this.getRegionSettings(region);
    const breakDuration = Math.floor(settings.pauseDuration);
    
    // Use SSML-like pauses that work with speech synthesis
    const shortBreak = '. '; // Natural pause
    const mediumBreak = '... '; // Longer pause
    
    return `${word}${mediumBreak}${meaning}${mediumBreak}${example}${shortBreak}`;
  }

  async speak(
    text: string, 
    options: {
      voiceRegion?: 'US' | 'UK';
      word?: string;
      meaning?: string;
      example?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: any) => void;
    } = {}
  ): Promise<boolean> {
    const region = options.voiceRegion || 'US';
    console.log(`[DIRECT-SPEECH] speak() called with region: ${region}`);
    
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

        // Format text with breaks if individual parts are provided
        let speechText = text;
        if (options.word && options.meaning && options.example) {
          speechText = this.formatTextWithBreaks(
            options.word,
            options.meaning,
            options.example,
            region
          );
          console.log(`[DIRECT-SPEECH] Formatted text with breaks: ${speechText.substring(0, 100)}...`);
        }

        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(speechText);
        this.currentUtterance = utterance;
        this.isActive = true;

        // Get region-specific settings
        const settings = this.getRegionSettings(region);

        // Enhanced voice selection with region-specific preferences
        const voice = getVoiceByRegion(region, 'female');
        if (voice) {
          utterance.voice = voice;
          console.log(`[DIRECT-SPEECH] Using ${region} voice: ${voice.name}, ${voice.lang}`);
        } else {
          console.warn(`[DIRECT-SPEECH] No suitable ${region} voice found, using default`);
        }

        // Apply region-specific settings
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;

        console.log(`[DIRECT-SPEECH] Speech settings - Rate: ${settings.rate}, Region: ${region}`);

        // Set up event handlers with enhanced timing
        utterance.onstart = () => {
          console.log(`[DIRECT-SPEECH] ✓ Speech started for ${region} voice`);
          options.onStart?.();
          resolve(true);
        };

        utterance.onend = () => {
          console.log(`[DIRECT-SPEECH] ✓ Speech ended normally for ${region} voice`);
          this.cleanup();
          
          // Add region-specific delay before triggering onEnd
          setTimeout(() => {
            options.onEnd?.();
          }, settings.pauseDuration);
        };

        utterance.onerror = (event) => {
          console.error(`[DIRECT-SPEECH] ✗ Speech error for ${region} voice:`, event.error);
          this.cleanup();
          options.onError?.(event);
        };

        // Start speech with small delay to ensure proper setup
        console.log(`[DIRECT-SPEECH] Starting speech synthesis for ${region} voice...`);
        setTimeout(() => {
          if (this.currentUtterance === utterance && this.isActive) {
            window.speechSynthesis.speak(utterance);
          }
        }, 100);

        // Fallback timeout with region-specific timing
        setTimeout(() => {
          if (this.isActive && this.currentUtterance === utterance) {
            console.log(`[DIRECT-SPEECH] Fallback - assuming speech started for ${region}`);
            resolve(true);
          }
        }, 1500);

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
