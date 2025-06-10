import { getSpeechRate, getSpeechPitch, getSpeechVolume, getTimingSettings } from './speechSettings';
import { formatTextForSpeech, estimateSpeechDuration } from './textProcessor';

interface SpeechOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  region?: 'US' | 'UK';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

interface SpeechState {
  isActive: boolean;
  isPaused: boolean;
  currentUtterance: SpeechSynthesisUtterance | null;
  currentRegion: 'US' | 'UK';
}

class EnhancedSpeechController {
  private state: SpeechState = {
    isActive: false,
    isPaused: false,
    currentUtterance: null,
    currentRegion: 'US'
  };
  
  private subscribers: ((state: SpeechState) => void)[] = [];
  private keepAliveInterval: number | null = null;

  constructor() {
    this.setupKeepAlive();
  }

  private setupKeepAlive() {
    // Keep speech synthesis responsive
    this.keepAliveInterval = window.setInterval(() => {
      if (window.speechSynthesis && this.state.isActive) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 14000);
  }

  private updateState(updates: Partial<SpeechState>) {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  subscribe(callback: (state: SpeechState) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  async speak(text: string, options: SpeechOptions = {}): Promise<boolean> {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      return false;
    }

    // Stop any current speech
    this.stop();

    const region = options.region || this.state.currentRegion;
    const timing = getTimingSettings(region);
    
    console.log(`[SPEECH-CONTROLLER] Speaking with ${region} settings:`, {
      rate: options.rate || getSpeechRate(region),
      timing: timing
    });

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance();
        
        // Enhanced text formatting for better speech flow
        const formattedText = formatTextForSpeech(text, '', '', region);
        utterance.text = formattedText;
        
        // Apply regional speech settings
        utterance.rate = options.rate || getSpeechRate(region);
        utterance.pitch = options.pitch || getSpeechPitch();
        utterance.volume = options.volume || getSpeechVolume();
        utterance.lang = region === 'UK' ? 'en-GB' : 'en-US';
        
        if (options.voice) {
          utterance.voice = options.voice;
        }

        // Setup event handlers
        utterance.onstart = () => {
          console.log(`[SPEECH-CONTROLLER] Speech started (${region} voice)`);
          this.updateState({ 
            isActive: true, 
            isPaused: false, 
            currentUtterance: utterance,
            currentRegion: region
          });
          options.onStart?.();
        };

        utterance.onend = () => {
          console.log(`[SPEECH-CONTROLLER] Speech completed (${region} voice)`);
          this.updateState({ 
            isActive: false, 
            isPaused: false, 
            currentUtterance: null 
          });
          options.onEnd?.();
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error(`[SPEECH-CONTROLLER] Speech error (${region} voice):`, event.error);
          this.updateState({ 
            isActive: false, 
            isPaused: false, 
            currentUtterance: null 
          });
          options.onError?.(event);
          resolve(false);
        };

        // Store reference and speak
        this.state.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
        
        // Verify speech started
        setTimeout(() => {
          if (!window.speechSynthesis.speaking && !this.state.isPaused) {
            console.warn(`[SPEECH-CONTROLLER] Speech may not have started properly`);
            resolve(false);
          }
        }, 100);

      } catch (error) {
        console.error('[SPEECH-CONTROLLER] Error creating utterance:', error);
        resolve(false);
      }
    });
  }

  stop(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.updateState({ 
        isActive: false, 
        isPaused: false, 
        currentUtterance: null 
      });
    }
  }

  pause(): void {
    if (window.speechSynthesis && this.state.isActive) {
      window.speechSynthesis.pause();
      this.updateState({ isPaused: true });
    }
  }

  resume(): void {
    if (window.speechSynthesis && this.state.isPaused) {
      window.speechSynthesis.resume();
      this.updateState({ isPaused: false });
    }
  }

  getState(): SpeechState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  destroy(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    this.stop();
    this.subscribers = [];
  }
}

export const enhancedSpeechController = new EnhancedSpeechController();
