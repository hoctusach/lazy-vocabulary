
import { mobileVoiceManager } from './mobileVoiceManager';
import { validateVoiceForRegion, isMobileChrome } from '@/utils/speech/mobileVoiceDetection';

interface SpeechOptions {
  voiceRegion: 'US' | 'UK';
  word: string;
  meaning: string;
  example: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

class DirectSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    console.log('[DIRECT-SPEECH] Initializing service...');
    
    if (!window.speechSynthesis) {
      console.error('[DIRECT-SPEECH] Speech synthesis not supported');
      return false;
    }

    // Initialize mobile voice manager
    const success = await mobileVoiceManager.initialize();
    
    if (success) {
      this.isInitialized = true;
      console.log('[DIRECT-SPEECH] Service initialized successfully');
      
      // Log debug info for mobile Chrome
      if (isMobileChrome()) {
        console.log('[DIRECT-SPEECH] Mobile Chrome detected, debug info:', 
          mobileVoiceManager.getDebugInfo());
      }
    } else {
      console.error('[DIRECT-SPEECH] Failed to initialize voice manager');
    }

    return success;
  }

  async speak(text: string, options: SpeechOptions): Promise<boolean> {
    console.log(`[DIRECT-SPEECH] === Speaking: "${text.substring(0, 30)}..." ===`);
    console.log(`[DIRECT-SPEECH] Requested region: ${options.voiceRegion}`);

    // Ensure initialization
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('[DIRECT-SPEECH] Service not initialized');
      options.onError?.('Service not initialized');
      return false;
    }

    // Stop any current speech
    this.stop();

    try {
      // Get the appropriate voice using our enhanced detection
      const selectedVoice = mobileVoiceManager.getVoiceForRegion(options.voiceRegion);
      
      console.log(`[DIRECT-SPEECH] Selected voice:`, {
        name: selectedVoice?.name || 'none',
        lang: selectedVoice?.lang || 'none',
        localService: selectedVoice?.localService || false
      });

      // Validate the voice actually matches the requested region
      if (selectedVoice && !validateVoiceForRegion(selectedVoice, options.voiceRegion)) {
        console.warn(`[DIRECT-SPEECH] Voice validation failed for ${options.voiceRegion}, but proceeding anyway`);
      }

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Set up event handlers
      utterance.onstart = () => {
        console.log(`[DIRECT-SPEECH] ✓ Speech started with voice: ${utterance.voice?.name || 'default'} (${utterance.voice?.lang || 'unknown'})`);
        options.onStart?.();
      };

      utterance.onend = () => {
        console.log(`[DIRECT-SPEECH] ✓ Speech completed successfully`);
        this.currentUtterance = null;
        options.onEnd?.();
      };

      utterance.onerror = (event) => {
        console.error(`[DIRECT-SPEECH] ✗ Speech error:`, {
          error: event.error,
          type: event.type,
          voiceName: utterance.voice?.name || 'none',
          voiceLang: utterance.voice?.lang || 'none'
        });
        
        this.currentUtterance = null;
        options.onError?.(event);
      };

      // Store current utterance
      this.currentUtterance = utterance;

      // Start speech
      console.log(`[DIRECT-SPEECH] Starting speech synthesis...`);
      window.speechSynthesis.speak(utterance);

      // Additional mobile Chrome debugging
      if (isMobileChrome()) {
        setTimeout(() => {
          const synthState = {
            pending: window.speechSynthesis.pending,
            speaking: window.speechSynthesis.speaking,
            paused: window.speechSynthesis.paused
          };
          console.log('[DIRECT-SPEECH] Mobile Chrome speech state:', synthState);
        }, 100);
      }

      return true;

    } catch (error) {
      console.error('[DIRECT-SPEECH] Exception in speak method:', error);
      options.onError?.(error);
      return false;
    }
  }

  stop(): void {
    console.log('[DIRECT-SPEECH] Stopping speech');
    
    if (this.currentUtterance) {
      this.currentUtterance = null;
    }
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  getCurrentVoiceInfo(region: 'US' | 'UK') {
    const voice = mobileVoiceManager.getVoiceForRegion(region);
    return {
      name: voice?.name || 'none',
      lang: voice?.lang || 'none',
      localService: voice?.localService || false,
      isValid: voice ? validateVoiceForRegion(voice, region) : false
    };
  }

  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      currentUtterance: !!this.currentUtterance,
      isMobileChrome: isMobileChrome(),
      voiceManager: mobileVoiceManager.getDebugInfo(),
      speechSynthesis: {
        pending: window.speechSynthesis?.pending || false,
        speaking: window.speechSynthesis?.speaking || false,
        paused: window.speechSynthesis?.paused || false
      }
    };
  }
}

export const directSpeechService = new DirectSpeechService();
