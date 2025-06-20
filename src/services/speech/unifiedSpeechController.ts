
import { VocabularyWord } from '@/types/vocabulary';
import { realSpeechService } from './realSpeechService';

interface SpeechGuardResult {
  canPlay: boolean;
  reason?: string;
}

class UnifiedSpeechController {
  private wordCompleteCallback: (() => void) | null = null;
  private isMutedState = false;

  async speak(
    word: VocabularyWord,
    region: 'US' | 'UK' | 'AU' = 'US'
  ): Promise<boolean> {
    if (this.isMutedState) {
      console.log('Speech is muted, skipping');
      return false;
    }

    const parts = [word.word, word.meaning, word.example]
      .filter(Boolean)
      .map(part => part.trim());
    const text = parts.join('. ');

    console.log('Speaking word:', word.word, 'in region:', region);

    return realSpeechService.speak(text, {
      voiceRegion: region,
      onStart: () => {
        console.log('Word speech started:', word.word);
      },
      onEnd: () => {
        console.log('Word speech completed:', word.word);
        if (this.wordCompleteCallback) {
          this.wordCompleteCallback();
        }
      },
      onError: (error) => {
        console.error('Word speech error:', error);
      }
    });
  }

  stop(): void {
    realSpeechService.stop();
  }

  pause(): void {
    realSpeechService.pause();
  }

  resume(): void {
    realSpeechService.resume();
  }

  isCurrentlyActive(): boolean {
    return realSpeechService.isCurrentlyActive();
  }

  isPaused(): boolean {
    return window.speechSynthesis?.paused || false;
  }

  canSpeak(): SpeechGuardResult {
    if (this.isMutedState) {
      return { canPlay: false, reason: 'muted' };
    }
    if (this.isPaused()) {
      return { canPlay: false, reason: 'paused' };
    }
    if (realSpeechService.isCurrentlyActive()) {
      return { canPlay: false, reason: 'active' };
    }
    return { canPlay: true };
  }

  getState() {
    const paused = this.isPaused();
    const isActive = realSpeechService.isCurrentlyActive();
    return {
      isActive,
      audioUnlocked: true,
      phase: isActive ? 'speaking' : paused ? 'paused' : 'idle',
      currentUtterance: realSpeechService.getCurrentUtterance()
    };
  }

  setMuted(muted: boolean): void {
    console.log('Setting muted state:', muted);
    this.isMutedState = muted;
    if (muted && this.isCurrentlyActive()) {
      this.stop();
    }
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
