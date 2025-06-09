
import { VocabularyWord } from '@/types/vocabulary';
import { getRegionSpeechSettings, getVoiceRegionFromStorage } from '@/utils/speech/core/enhancedSpeechSettings';
import { prepareEnhancedSpeechText } from '@/utils/speech/core/enhancedTextSegmentation';
import { findEnhancedVoiceByRegion } from '@/utils/speech/enhancedVoiceUtils';

/**
 * Enhanced speech service with region-specific settings and improved voice selection
 */
class EnhancedSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;

  async speakWord(
    word: VocabularyWord,
    options: {
      voiceRegion?: 'US' | 'UK';
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: any) => void;
    } = {}
  ): Promise<boolean> {
    const region = options.voiceRegion || getVoiceRegionFromStorage();
    console.log(`[ENHANCED-SPEECH] Speaking word "${word.word}" with ${region} voice`);
    
    // Stop any existing speech
    this.stop();
    
    return new Promise((resolve) => {
      try {
        // Check if speech synthesis is supported
        if (!window.speechSynthesis) {
          console.error('[ENHANCED-SPEECH] Speech synthesis not supported');
          options.onError?.('Speech synthesis not supported');
          resolve(false);
          return;
        }

        // Get region-specific settings
        const speechSettings = getRegionSpeechSettings(region);
        console.log(`[ENHANCED-SPEECH] Using ${region} settings:`, speechSettings);

        // Prepare enhanced text with breaks
        const speechText = prepareEnhancedSpeechText(word, region);
        console.log(`[ENHANCED-SPEECH] Prepared text:`, speechText.substring(0, 100) + '...');

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(speechText);
        this.currentUtterance = utterance;
        this.isActive = true;

        // Apply enhanced voice selection
        const voice = findEnhancedVoiceByRegion(region, 'female');
        if (voice) {
          utterance.voice = voice;
          console.log(`[ENHANCED-SPEECH] Using enhanced voice: ${voice.name} (${voice.lang})`);
        } else {
          console.warn(`[ENHANCED-SPEECH] No enhanced voice found for ${region}, using default`);
        }

        // Apply region-specific speech settings
        utterance.rate = speechSettings.rate;
        utterance.pitch = speechSettings.pitch;
        utterance.volume = speechSettings.volume;

        console.log(`[ENHANCED-SPEECH] Speech settings applied: rate=${utterance.rate}, pitch=${utterance.pitch}`);

        // Set up event handlers
        utterance.onstart = () => {
          console.log('[ENHANCED-SPEECH] ✓ Enhanced speech started');
          options.onStart?.();
          resolve(true);
        };

        utterance.onend = () => {
          console.log('[ENHANCED-SPEECH] ✓ Enhanced speech ended');
          this.cleanup();
          options.onEnd?.();
        };

        utterance.onerror = (event) => {
          console.error('[ENHANCED-SPEECH] ✗ Enhanced speech error:', event.error);
          this.cleanup();
          options.onError?.(event);
        };

        // Start enhanced speech
        console.log('[ENHANCED-SPEECH] Starting enhanced speech synthesis...');
        window.speechSynthesis.speak(utterance);

        // Fallback timeout
        setTimeout(() => {
          if (this.isActive && this.currentUtterance === utterance) {
            console.log('[ENHANCED-SPEECH] Fallback - assuming enhanced speech started');
            resolve(true);
          }
        }, 1000);

      } catch (error) {
        console.error('[ENHANCED-SPEECH] Exception in enhanced speech:', error);
        this.cleanup();
        options.onError?.(error);
        resolve(false);
      }
    });
  }

  stop(): void {
    console.log('[ENHANCED-SPEECH] Stopping enhanced speech');
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('[ENHANCED-SPEECH] ✓ Enhanced speech cancelled');
    }
    
    this.cleanup();
  }

  private cleanup(): void {
    console.log('[ENHANCED-SPEECH] Cleaning up enhanced speech service');
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

export const enhancedSpeechService = new EnhancedSpeechService();
