
import { VocabularyWord } from '@/types/vocabulary';

interface SpeechOptions {
  voiceRegion: 'US' | 'UK' | 'AU';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
}

class RealSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;

  async speak(text: string, options: SpeechOptions): Promise<boolean> {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      return false;
    }

    console.log('RealSpeechService: Starting speech for:', text.substring(0, 50) + '...');
    
    // Stop any current speech
    this.stop();
    
    // Wait for voices to be loaded
    await this.ensureVoicesLoaded();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice based on region
      const voice = this.findVoiceByRegion(options.voiceRegion);
      if (voice) {
        utterance.voice = voice;
        console.log('Using voice:', voice.name, 'for region:', options.voiceRegion);
      } else {
        console.warn('No suitable voice found for region:', options.voiceRegion);
      }

      // Configure speech settings
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Set up event handlers
      utterance.onstart = () => {
        console.log('Speech started for:', text.substring(0, 30) + '...');
        this.isActive = true;
        this.currentUtterance = utterance;
        if (options.onStart) {
          options.onStart();
        }
      };

      utterance.onend = () => {
        console.log('Speech ended');
        this.isActive = false;
        this.currentUtterance = null;
        if (options.onEnd) {
          options.onEnd();
        }
        resolve(true);
      };

      utterance.onerror = (event) => {
        console.error('Speech error:', event.error, event);
        this.isActive = false;
        this.currentUtterance = null;
        if (options.onError) {
          options.onError(event);
        }
        resolve(false);
      };

      // Start speech
      try {
        window.speechSynthesis.speak(utterance);
        console.log('Speech synthesis started successfully');
      } catch (error) {
        console.error('Failed to start speech synthesis:', error);
        this.isActive = false;
        this.currentUtterance = null;
        resolve(false);
      }
    });
  }

  private async ensureVoicesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve();
        return;
      }

      const loadVoices = () => {
        const newVoices = window.speechSynthesis.getVoices();
        if (newVoices.length > 0) {
          console.log('Voices loaded:', newVoices.length, 'voices available');
          resolve();
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
      
      // Fallback timeout
      setTimeout(() => {
        console.log('Voice loading timeout, continuing anyway');
        resolve();
      }, 2000);
    });
  }

  stop(): void {
    if (window.speechSynthesis) {
      if (this.currentUtterance) {
        this.currentUtterance.onend = null;
        this.currentUtterance.onerror = null;
      }
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
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  isCurrentlyActive(): boolean {
    return this.isActive && window.speechSynthesis?.speaking;
  }

  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  private findVoiceByRegion(region: 'US' | 'UK' | 'AU'): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length === 0) {
      console.warn('No voices available');
      return null;
    }

    console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    
    const regionPatterns = {
      US: ['en-US', 'en_US'],
      UK: ['en-GB', 'en_GB'],
      AU: ['en-AU', 'en_AU']
    };

    const patterns = regionPatterns[region];
    
    // First try to find exact language matches
    for (const pattern of patterns) {
      const voice = voices.find(v => v.lang === pattern || v.lang.startsWith(pattern.substring(0, 5)));
      if (voice) {
        console.log(`Found ${region} voice:`, voice.name, voice.lang);
        return voice;
      }
    }

    // Fallback to any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      console.log(`Using fallback English voice for ${region}:`, englishVoice.name);
      return englishVoice;
    }

    // Last resort - use first available voice
    if (voices.length > 0) {
      console.log(`Using first available voice for ${region}:`, voices[0].name);
      return voices[0];
    }

    console.warn(`No suitable voice found for region ${region}`);
    return null;
  }
}

export const realSpeechService = new RealSpeechService();
