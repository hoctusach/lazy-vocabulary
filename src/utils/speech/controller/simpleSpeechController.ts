
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Silent speech controller that preserves timing without actual speech
 */
class SimpleSpeechController {
  private isActive = false;

  async speak(word: VocabularyWord, region: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    if (this.isActive) {
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
    this.isActive = false;
  }

  resume(): void {
    // No-op for silent controller
  }

  isCurrentlyActive(): boolean {
    return this.isActive;
  }
}

export const simpleSpeechController = new SimpleSpeechController();
