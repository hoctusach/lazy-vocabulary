
import { VocabularyWord } from '@/types/vocabulary';

interface SpeechState {
  isActive: boolean;
  isPaused: boolean;
  isMuted: boolean;
  currentWord: VocabularyWord | null;
}

type StateChangeListener = (state: SpeechState) => void;

/**
 * Silent speech controller that preserves UI/UX without actual speech or logging
 */
class SilentSpeechController {
  private state: SpeechState = {
    isActive: false,
    isPaused: false,
    isMuted: false,
    currentWord: null
  };

  private listeners: StateChangeListener[] = [];
  private wordCompleteCallback: (() => void) | null = null;

  // Subscribe to state changes
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Get current state
  getState(): SpeechState {
    return { ...this.state };
  }

  // Set word completion callback
  setWordCompleteCallback(callback: (() => void) | null): void {
    this.wordCompleteCallback = callback;
  }

  // Mock speak method that simulates speech timing without actual speech
  async speak(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    if (this.state.isPaused || this.state.isMuted) {
      return false;
    }

    this.state.isActive = true;
    this.state.currentWord = word;
    this.notifyListeners();

    // Simulate speech duration without actual speech
    const speechDuration = Math.max(2000, word.word.length * 100);
    
    setTimeout(() => {
      this.state.isActive = false;
      this.state.currentWord = null;
      this.notifyListeners();
      
      // Trigger word completion callback
      if (this.wordCompleteCallback) {
        this.wordCompleteCallback();
      }
    }, speechDuration);

    return true;
  }

  // Stop speech
  stop(): void {
    this.state.isActive = false;
    this.state.currentWord = null;
    this.notifyListeners();
  }

  // Pause speech
  pause(): void {
    this.state.isPaused = true;
    this.state.isActive = false;
    this.notifyListeners();
  }

  // Resume speech
  resume(): void {
    this.state.isPaused = false;
    this.notifyListeners();
  }

  // Set muted state
  setMuted(muted: boolean): void {
    this.state.isMuted = muted;
    if (muted && this.state.isActive) {
      this.stop();
    }
    this.notifyListeners();
  }

  // Check if currently active
  isCurrentlyActive(): boolean {
    return this.state.isActive;
  }

  // Legacy compatibility
  isPaused(): boolean {
    return this.state.isPaused;
  }

  canSpeak(): boolean {
    return !this.state.isPaused && !this.state.isMuted;
  }

  // Cleanup method
  destroy(): void {
    this.listeners = [];
    this.wordCompleteCallback = null;
    this.state = {
      isActive: false,
      isPaused: false,
      isMuted: false,
      currentWord: null
    };
  }
}

export const silentSpeechController = new SilentSpeechController();
