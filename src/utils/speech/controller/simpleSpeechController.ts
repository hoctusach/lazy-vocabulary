
import { VocabularyWord } from '@/types/vocabulary';

export interface SpeechState {
  isActive: boolean;
  audioUnlocked: boolean;
  phase: 'idle' | 'speaking' | 'paused';
  currentUtterance: null;
}

/**
 * Silent speech controller that preserves timing without actual speech
 */
class SimpleSpeechController {
  private isActive = false;
  private paused = false;
  private audioUnlocked = true;

  async speak(word: VocabularyWord, region: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    if (this.isActive || this.paused) {
      return false;
    }

    this.isActive = true;

    // Simulate speech timing without actual speech
    const duration = Math.max(2000, word.word.length * 100);
    
    setTimeout(() => {
      this.isActive = false;
    }, duration);

    return true;
  }

  stop(): void {
    this.isActive = false;
  }

  pause(): void {
    this.paused = true;
    this.isActive = false;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isCurrentlyActive(): boolean {
    return this.isActive;
  }

  getState(): SpeechState {
    return {
      isActive: this.isActive,
      audioUnlocked: this.audioUnlocked,
      phase: this.isActive ? 'speaking' : this.paused ? 'paused' : 'idle',
      currentUtterance: null
    };
  }
}

export const simpleSpeechController = new SimpleSpeechController();
