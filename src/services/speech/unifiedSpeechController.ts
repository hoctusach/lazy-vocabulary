
import { VocabularyWord } from '@/types/vocabulary';
import { directSpeechService } from './directSpeechService';

interface SpeechGuardResult {
  canPlay: boolean;
  reason?: string;
}

class UnifiedSpeechController {
  private wordCompleteCallback: (() => void) | null = null;

  async speak(
    word: VocabularyWord,
    region: 'US' | 'UK' | 'AU' = 'US'
  ): Promise<boolean> {
    const parts = [word.word, word.meaning, word.example]
      .filter(Boolean)
      .map(part => part.trim());
    const text = parts.join('. ');

    return directSpeechService.speak(text, {
      voiceRegion: region,
      onEnd: () => {
        if (this.wordCompleteCallback) {
          this.wordCompleteCallback();
        }
      }
    });
  }

  stop(): void {
    directSpeechService.stop();
  }

  pause(): void {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }

  isCurrentlyActive(): boolean {
    return directSpeechService.isCurrentlyActive();
  }

  isPaused(): boolean {
    return window.speechSynthesis?.paused || false;
  }

  canSpeak(): SpeechGuardResult {
    if (this.isPaused()) {
      return { canPlay: false, reason: 'paused' };
    }
    if (directSpeechService.isCurrentlyActive()) {
      return { canPlay: false, reason: 'active' };
    }
    return { canPlay: true };
  }

  getState() {
    const paused = this.isPaused();
    const isActive = directSpeechService.isCurrentlyActive();
    return {
      isActive,
      audioUnlocked: true,
      phase: isActive ? 'speaking' : paused ? 'paused' : 'idle',
      currentUtterance: directSpeechService.getCurrentUtterance()
    };
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
