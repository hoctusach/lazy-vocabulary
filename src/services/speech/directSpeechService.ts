
import { getVoiceByRegion } from '@/utils/speech/voiceUtils';
import { mobileAudioManager } from '@/utils/audio/mobileAudioManager';

/**
 * Enhanced direct speech service with improved completion detection and error handling
 */
class DirectSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;
  private completionTimeoutId: number | null = null;
  private wasManuallyStopped = false;
  private cancelledUtterance: SpeechSynthesisUtterance | null = null;

  // Region-specific speech settings
  private getRegionSettings(region: 'US' | 'UK' | 'AU') {
    return {
      US: {
        rate: 0.6, // Slower for better comprehension
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: 600
      },
      UK: {
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: 500
      },
      AU: {
        rate: 0.6,
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: 500
      }
    }[region];
  }

  // Format text into individual segments with punctuation
  private formatTextWithBreaks(
    word: string,
    meaning: string,
    example: string
  ): string[] {
    const addPeriod = (t: string) => {
      const trimmed = t.trim();
      return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
    };

    return [addPeriod(word), addPeriod(meaning), addPeriod(example)];
  }

  // Estimate speech duration for timeout fallback
  private estimateSpeechDuration(
    text: string | string[],
    rate: number,
    pauseDuration = 0
  ): number {
    if (Array.isArray(text)) {
      const total = text.reduce(
        (sum, segment) => sum + this.estimateSpeechDuration(segment, rate),
        0
      );
      const pauses = pauseDuration * Math.max(0, text.length - 1);
      return total + pauses;
    }

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
    this.wasManuallyStopped = false;

    // Ensure mobile audio context is ready
    try {
      await mobileAudioManager.initialize();
      await mobileAudioManager.resume();
    } catch (e) {
      console.warn('[DIRECT-SPEECH] Failed to init mobile audio manager:', e);
    }
    
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
        let segments: string[] = [text];
        if (options.word && options.meaning && options.example) {
          segments = this.formatTextWithBreaks(
            options.word,
            options.meaning,
            options.example
          );
        }

        const speechText = segments.join(' ');
        console.log(`[DIRECT-SPEECH] Speech text: ${speechText.substring(0, 100)}...`);

        this.isActive = true;

        // Get settings
        const settings = this.getRegionSettings(region);

        // Set voice once for all utterances
        const voice = getVoiceByRegion(region, 'female');

        const speakSegment = (index: number) => {
          if (index >= segments.length) {
            this.cleanup();
            setTimeout(() => {
              options.onEnd?.();
            }, settings.pauseDuration);
            return;
          }

          const utterance = new SpeechSynthesisUtterance(segments[index]);
          this.currentUtterance = utterance;

          if (voice) {
            utterance.voice = voice;
          } else {
            console.warn(`[DIRECT-SPEECH] No ${region} voice found, using default`);
          }

          utterance.rate = settings.rate;
          utterance.pitch = settings.pitch;
          utterance.volume = settings.volume;

          utterance.onstart = () => {
            if (index === 0) {
              console.log(`[DIRECT-SPEECH] ✓ Speech started for: ${options.word || 'text'}`);
              options.onStart?.();
              resolve(true);
            }
          };

          utterance.onend = () => {
            if (this.wasManuallyStopped) {
              this.cleanup();
              return;
            }

            setTimeout(() => {
              speakSegment(index + 1);
            }, settings.pauseDuration);
          };

          utterance.onerror = (event) => {
            const manual =
              (this.wasManuallyStopped || this.cancelledUtterance === utterance) &&
              event.error === 'interrupted';
            if (manual) {
              console.log('[DIRECT-SPEECH] Ignoring interrupted error after manual stop');
            } else {
              console.error(`[DIRECT-SPEECH] ✗ Speech error:`, event.error, event);
            }
            this.cleanup();
            this.wasManuallyStopped = false;
            this.cancelledUtterance = null;

            if (!manual) {
              options.onError?.(event);
            }
          };

          window.speechSynthesis.speak(utterance);
        };

        // Set up completion timeout as fallback
        const estimatedDuration = this.estimateSpeechDuration(
          segments,
          settings.rate,
          settings.pauseDuration
        );
        console.log(`[DIRECT-SPEECH] Setting completion timeout: ${estimatedDuration}ms`);

        this.completionTimeoutId = window.setTimeout(() => {
          if (this.isActive) {
            console.log('[DIRECT-SPEECH] ⏰ Completion timeout reached, assuming speech finished');
            this.cleanup();
            options.onEnd?.();
          }
        }, estimatedDuration);

        // Start speech
        console.log(`[DIRECT-SPEECH] Starting speech synthesis...`);
        speakSegment(0);

        // Fallback timeout for start confirmation
        setTimeout(() => {
          if (this.isActive) {
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
    this.wasManuallyStopped = true;
    this.cancelledUtterance = this.currentUtterance;
    
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
