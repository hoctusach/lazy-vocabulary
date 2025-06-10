
import { getVoiceByRegion } from '@/utils/speech/voiceUtils';

export interface SpeechOptions {
  voiceRegion: 'US' | 'UK';
  word?: string;
  meaning?: string;
  example?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

/**
 * Unified speech service that consolidates all speech functionality
 * Addresses timing issues, voice selection problems, and mobile compatibility
 */
class UnifiedSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;
  private speechQueue: Array<{ text: string; options: SpeechOptions; resolve: (success: boolean) => void }> = [];
  private isProcessingQueue = false;

  // Enhanced region-specific settings with mobile optimization
  private getRegionSettings(region: 'US' | 'UK') {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    return {
      US: {
        rate: isMobile ? 0.6 : 0.7, // Slower on mobile for better clarity
        pitch: 1.0,
        volume: 1.0,
        pauseDuration: isMobile ? 1000 : 800,
        voiceNames: ['Samantha', 'Microsoft Zira', 'Google US English Female']
      },
      UK: {
        rate: isMobile ? 0.65 : 0.75, // Fixed: slower rate for UK voice stability
        pitch: 0.95, // Fixed: slightly lower pitch for better UK voice quality
        volume: 1.0,
        pauseDuration: isMobile ? 900 : 700,
        voiceNames: ['Google UK English Female', 'Daniel', 'Microsoft Hazel', 'Kate']
      }
    }[region];
  }

  // Enhanced text formatting with proper breaks and mobile optimization
  private formatTextWithBreaks(word: string, meaning: string, example: string, region: 'US' | 'UK'): string {
    const settings = this.getRegionSettings(region);
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Clean and prepare text segments
    const cleanWord = this.cleanTextForSpeech(word);
    const cleanMeaning = this.cleanTextForSpeech(meaning);
    const cleanExample = this.cleanTextForSpeech(example);
    
    // Use longer pauses on mobile and for UK voices
    const shortBreak = isMobile ? '... ' : '. ';
    const mediumBreak = isMobile ? '..... ' : '... ';
    const longBreak = region === 'UK' ? '..... ' : mediumBreak;
    
    return `${cleanWord}${longBreak}${cleanMeaning}${longBreak}${cleanExample}${shortBreak}`;
  }

  // Enhanced text cleaning for better speech quality
  private cleanTextForSpeech(text: string): string {
    if (!text) return '';
    
    return text
      // Remove IPA phonetic notation
      .replace(/\/[^\/]+\//g, '')
      // Remove Vietnamese translations
      .replace(/:\s*[^\u0000-\u007F]+[^.]*\./g, '.')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      // Remove extra periods
      .replace(/\.+/g, '.')
      // Clean up colons and formatting
      .replace(/:\s*\./g, '.')
      .trim();
  }

  // Enhanced voice selection with better fallbacks
  private selectVoice(region: 'US' | 'UK'): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    const settings = this.getRegionSettings(region);
    
    console.log(`[UNIFIED-SPEECH] Selecting ${region} voice from ${voices.length} available voices`);
    
    // Try preferred voice names first
    for (const voiceName of settings.voiceNames) {
      let voice = voices.find(v => v.name === voiceName);
      if (voice) {
        console.log(`[UNIFIED-SPEECH] Found preferred voice: ${voice.name} (${voice.lang})`);
        return voice;
      }
      
      // Try partial match
      voice = voices.find(v => v.name.includes(voiceName));
      if (voice) {
        console.log(`[UNIFIED-SPEECH] Found partial match: ${voice.name} (${voice.lang})`);
        return voice;
      }
    }
    
    // Fallback to language code
    const langCode = region === 'US' ? 'en-US' : 'en-GB';
    let voice = voices.find(v => v.lang === langCode);
    
    if (voice) {
      console.log(`[UNIFIED-SPEECH] Using language fallback: ${voice.name} (${voice.lang})`);
      return voice;
    }
    
    // Last resort: any English voice
    voice = voices.find(v => v.lang.startsWith('en'));
    if (voice) {
      console.log(`[UNIFIED-SPEECH] Using English fallback: ${voice.name} (${voice.lang})`);
      return voice;
    }
    
    console.warn(`[UNIFIED-SPEECH] No suitable ${region} voice found`);
    return null;
  }

  // Process speech queue to prevent overlapping
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.speechQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    while (this.speechQueue.length > 0) {
      const { text, options, resolve } = this.speechQueue.shift()!;
      
      try {
        const success = await this.executeSpeech(text, options);
        resolve(success);
      } catch (error) {
        console.error('[UNIFIED-SPEECH] Queue processing error:', error);
        resolve(false);
      }
      
      // Small delay between queue items
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessingQueue = false;
  }

  // Core speech execution with enhanced error handling
  private async executeSpeech(text: string, options: SpeechOptions): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        console.log(`[UNIFIED-SPEECH] Executing speech for ${options.voiceRegion} voice`);
        
        // Stop any existing speech
        this.stop();
        
        if (!window.speechSynthesis) {
          console.error('[UNIFIED-SPEECH] Speech synthesis not supported');
          options.onError?.('Speech synthesis not supported');
          resolve(false);
          return;
        }

        const settings = this.getRegionSettings(options.voiceRegion);
        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;
        this.isActive = true;

        // Enhanced voice selection
        const voice = this.selectVoice(options.voiceRegion);
        if (voice) {
          utterance.voice = voice;
        }

        // Apply region-specific settings with mobile optimization
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;
        
        console.log(`[UNIFIED-SPEECH] Settings - Rate: ${settings.rate}, Pitch: ${settings.pitch}, Region: ${options.voiceRegion}`);

        // Enhanced event handlers with better timing
        utterance.onstart = () => {
          console.log(`[UNIFIED-SPEECH] ✓ Speech started for ${options.voiceRegion} voice`);
          options.onStart?.();
        };

        utterance.onend = () => {
          console.log(`[UNIFIED-SPEECH] ✓ Speech ended for ${options.voiceRegion} voice`);
          this.cleanup();
          
          // Region-specific delay before onEnd callback
          setTimeout(() => {
            options.onEnd?.();
          }, settings.pauseDuration);
          
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error(`[UNIFIED-SPEECH] ✗ Speech error for ${options.voiceRegion}:`, event.error);
          this.cleanup();
          
          // Handle specific error types
          if (event.error === 'interrupted') {
            console.log('[UNIFIED-SPEECH] Speech was interrupted (normal during navigation)');
            resolve(false);
          } else if (event.error === 'not-allowed') {
            console.error('[UNIFIED-SPEECH] Speech not allowed - permission issue');
            options.onError?.(event);
            resolve(false);
          } else {
            console.warn(`[UNIFIED-SPEECH] Speech error: ${event.error}, but continuing`);
            options.onError?.(event);
            resolve(false);
          }
        };

        // Start speech with mobile-optimized delay
        const startDelay = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 200 : 100;
        
        setTimeout(() => {
          if (this.currentUtterance === utterance && this.isActive) {
            console.log(`[UNIFIED-SPEECH] Starting speech synthesis after ${startDelay}ms delay`);
            window.speechSynthesis.speak(utterance);
          }
        }, startDelay);

        // Enhanced fallback timeout with region-specific timing
        setTimeout(() => {
          if (this.isActive && this.currentUtterance === utterance) {
            console.log(`[UNIFIED-SPEECH] Fallback timeout - assuming speech started`);
            resolve(true);
          }
        }, 2000);

      } catch (error) {
        console.error('[UNIFIED-SPEECH] Exception in executeSpeech:', error);
        this.cleanup();
        options.onError?.(error);
        resolve(false);
      }
    });
  }

  async speak(text: string, options: SpeechOptions = { voiceRegion: 'US' }): Promise<boolean> {
    console.log(`[UNIFIED-SPEECH] speak() called with region: ${options.voiceRegion}`);
    
    // Format text with breaks if individual parts are provided
    let speechText = text;
    if (options.word && options.meaning && options.example) {
      speechText = this.formatTextWithBreaks(
        options.word,
        options.meaning,
        options.example,
        options.voiceRegion
      );
      console.log(`[UNIFIED-SPEECH] Formatted text length: ${speechText.length}`);
    }

    // Add to queue for processing
    return new Promise((resolve) => {
      this.speechQueue.push({ text: speechText, options, resolve });
      this.processQueue();
    });
  }

  stop(): void {
    console.log('[UNIFIED-SPEECH] stop() called');
    
    // Clear queue
    this.speechQueue = [];
    this.isProcessingQueue = false;
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      console.log('[UNIFIED-SPEECH] ✓ speechSynthesis.cancel() called');
    }
    
    this.cleanup();
  }

  private cleanup(): void {
    console.log('[UNIFIED-SPEECH] Cleaning up speech service');
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

export const unifiedSpeechService = new UnifiedSpeechService();
