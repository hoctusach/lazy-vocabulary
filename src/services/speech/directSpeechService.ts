
import { getVoiceByRegion } from '@/utils/speech/voiceUtils';

/**
 * Enhanced direct speech service with improved completion detection and error handling
 */
class DirectSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;
  private completionTimeoutId: number | null = null;

  // Region-specific speech settings
  private getRegionSettings(region: 'US' | 'UK' | 'AU') {
    return {
      US: {
        rate: 0.6, // Slower for lengthy text
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: 600
      },
      AU: {
        rate: 0.6,
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: 600
      },
      UK: {
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: 500
      }
    }[region];
  }

  // Format text with natural breaks
  private formatTextWithBreaks(word: string, meaning: string, example: string): string {
    const cleanWord = word.trim();
    const cleanMeaning = meaning.trim();
    const cleanExample = example.trim();
    
    // Use natural punctuation for pauses
    return `${cleanWord}. ${cleanMeaning}. ${cleanExample}.`;
  }

  // Estimate speech duration for timeout fallback
  private estimateSpeechDuration(text: string, rate: number): number {
    // Rough estimate: ~150 words per minute at normal rate, adjusted by rate
    const wordsPerMinute = 150 * rate;
    const wordCount = text.split(/\s+/).length;
    const baseSeconds = (wordCount / wordsPerMinute) * 60;
    
    // Add buffer time and minimum duration
    return Math.max(baseSeconds + 2, 5) * 1000; // Convert to milliseconds
  }

  async speak(
    text: string, 
    options: {
      voiceRegion?: 'US' | 'UK' | 'AU';
      word?: string;
      meaning?: string;
      example?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: any) => void;
    } = {}
  ): Promise<boolean> {
    const region = options.voiceRegion || 'US';
    console.log(`[DIRECT-SPEECH] speak() called - Region: ${region}, Word: ${options.word || 'N/A'}`);
    
    // Stop any existing speech
    this.stop();
    
    return new Promise((resolve) => {
      try {
        // Check browser support
        if (!window.speechSynthesis) {
          console.error('[DIRECT-SPEECH] Speech synthesis not supported');
          options.onError?.('Speech synthesis not supported');
          resolve(false);
          return;
        }

        // Format text if individual parts are provided
        let speechText = text;
        if (options.word && options.meaning && options.example) {
          speechText = this.formatTextWithBreaks(
            options.word,
            options.meaning,
            options.example
          );
        }

        console.log(`[DIRECT-SPEECH] Speech text: ${speechText.substring(0, 100)}...`);

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(speechText);
        this.currentUtterance = utterance;
        this.isActive = true;

        // Get settings
        const settings = this.getRegionSettings(region);

        // Set voice
        const voice = getVoiceByRegion(region, 'female');
        if (voice) {
          utterance.voice = voice;
          console.log(`[DIRECT-SPEECH] Using voice: ${voice.name} (${voice.lang})`);
        } else {
          console.warn(`[DIRECT-SPEECH] No ${region} voice found, using default`);
        }

        // Apply settings
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;

        // Set up event handlers
        utterance.onstart = () => {
          console.log(`[DIRECT-SPEECH] ✓ Speech started for: ${options.word || 'text'}`);
          options.onStart?.();
          resolve(true);
        };

        utterance.onend = () => {
          console.log(`[DIRECT-SPEECH] ✓ Speech completed for: ${options.word || 'text'}`);
          this.cleanup();
          
          // Small delay before triggering onEnd to ensure cleanup
          setTimeout(() => {
            options.onEnd?.();
          }, settings.pauseDuration);
        };

        utterance.onerror = (event) => {
          console.error(`[DIRECT-SPEECH] ✗ Speech error:`, event.error, event);
          this.cleanup();
          options.onError?.(event);
        };

        // Set up completion timeout as fallback
        const estimatedDuration = this.estimateSpeechDuration(speechText, settings.rate);
        console.log(`[DIRECT-SPEECH] Setting completion timeout: ${estimatedDuration}ms`);
        
        this.completionTimeoutId = window.setTimeout(() => {
          if (this.isActive && this.currentUtterance === utterance) {
            console.log('[DIRECT-SPEECH] ⏰ Completion timeout reached, assuming speech finished');
            this.cleanup();
            options.onEnd?.();
          }
        }, estimatedDuration);

        // Start speech
        console.log(`[DIRECT-SPEECH] Starting speech synthesis...`);
        window.speechSynthesis.speak(utterance);

        // Fallback timeout for start confirmation
        setTimeout(() => {
          if (this.isActive && this.currentUtterance === utterance) {
            console.log(`[DIRECT-SPEECH] Fallback - assuming speech started`);
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
    
    // Clear completion timeout
    if (this.completionTimeoutId) {
      clearTimeout(this.completionTimeoutId);
      this.completionTimeoutId = null;
    }
    
    // Stop speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('[DIRECT-SPEECH] ✓ speechSynthesis.cancel() called');
    }
    
    this.cleanup();
  }

  private cleanup(): void {
    console.log('[DIRECT-SPEECH] Cleaning up speech service');
    
    // Clear timeout
    if (this.completionTimeoutId) {
      clearTimeout(this.completionTimeoutId);
      this.completionTimeoutId = null;
    }
    
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
