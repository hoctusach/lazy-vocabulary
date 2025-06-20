
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

    // Stop any current speech
    this.stop();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice based on region
      const voice = this.findVoiceByRegion(options.voiceRegion);
      if (voice) {
        utterance.voice = voice;
      }

      // Configure speech settings
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Set up event handlers
      utterance.onstart = () => {
        console.log('Speech started:', text.substring(0, 30) + '...');
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
        console.error('Speech error:', event.error);
        this.isActive = false;
        this.currentUtterance = null;
        if (options.onError) {
          options.onError(event);
        }
        resolve(false);
      };

      // Start speech
      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
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
    
    const regionPatterns = {
      US: ['en-US', 'en_US', 'English (United States)'],
      UK: ['en-GB', 'en_GB', 'English (United Kingdom)', 'English (UK)'],
      AU: ['en-AU', 'en_AU', 'English (Australia)']
    };

    const patterns = regionPatterns[region];
    
    // First try to find exact matches
    for (const pattern of patterns) {
      const voice = voices.find(v => 
        v.lang === pattern || 
        v.name.includes(pattern) ||
        v.lang.startsWith(pattern.substring(0, 5))
      );
      if (voice) {
        console.log(`Found ${region} voice:`, voice.name);
        return voice;
      }
    }

    // Fallback to any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      console.log(`Using fallback English voice for ${region}:`, englishVoice.name);
      return englishVoice;
    }

    console.warn(`No suitable voice found for region ${region}`);
    return null;
  }
}

export const realSpeechService = new RealSpeechService();
