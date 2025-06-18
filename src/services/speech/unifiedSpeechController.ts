
import { VocabularyWord } from '@/types/vocabulary';
import { simpleSpeechController } from '@/utils/speech/controller/simpleSpeechController';

interface SpeechGuardResult {
  canPlay: boolean;
  reason?: string;
}

class UnifiedSpeechController {
  private wordCompleteCallback: (() => void) | null = null;

  async speak(word: VocabularyWord, region: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    return simpleSpeechController.speak(word, region);
  }

  stop(): void {
    simpleSpeechController.stop();
  }

  pause(): void {
    simpleSpeechController.pause();
  }

  resume(): void {
    simpleSpeechController.resume();
  }

  isCurrentlyActive(): boolean {
    return simpleSpeechController.isCurrentlyActive();
  }

  canSpeak(): SpeechGuardResult {
    if (simpleSpeechController.isPaused()) {
      return { canPlay: false, reason: 'paused' };
    }
    if (simpleSpeechController.isCurrentlyActive()) {
      return { canPlay: false, reason: 'active' };
    }
    return { canPlay: true };
  }

  getState() {
    return simpleSpeechController.getState();
  }

  setMuted(muted: boolean): void {
    // Silent implementation
  }

  setWordCompleteCallback(callback: (() => void) | null): void {
    this.wordCompleteCallback = callback;
  }

  subscribe(callback: (state: any) => void) {
    // Return empty unsubscribe function for compatibility
    return () => {};
  }
}

export const unifiedSpeechController = new UnifiedSpeechController();
