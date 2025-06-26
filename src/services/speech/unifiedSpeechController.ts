
import { VocabularyWord } from '@/types/vocabulary';
import { realSpeechService } from './realSpeechService';

interface SpeechGuardResult {
  canPlay: boolean;
  reason?: string;
}

class UnifiedSpeechController {
  private wordCompleteCallback: (() => void) | null = null;
  private isMutedState = false;
  private autoAdvanceTimer: number | null = null;
  private fallbackTimer: number | null = null;

  private clearFallbackTimer() {
    if (this.fallbackTimer) {
      console.log('Clearing speech fallback timer');
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  async speak(
    word: VocabularyWord,
    region: 'US' | 'UK' | 'AU' = 'US'
  ): Promise<boolean> {
    if (this.isMutedState) {
      console.log('Speech is muted, scheduling auto-advance instead');
      this.scheduleAutoAdvance();
      return false;
    }

    const parts = [word.word, word.meaning, word.example]
      .filter(Boolean)
      .map(part => part.trim());
    const text = parts.join('. ');

    console.log('UnifiedSpeechController: Speaking word:', word.word, 'in region:', region);

    return realSpeechService.speak(text, {
      voiceRegion: region,
      onStart: () => {
        console.log('Word speech started:', word.word);
        this.clearFallbackTimer();
        this.fallbackTimer = window.setTimeout(() => {
          console.warn('Speech fallback timer expired for', word.word);
          realSpeechService.stop();
          this.scheduleAutoAdvance();
        }, 5000);
        console.log('Started speech fallback timer for', word.word);
      },
      onEnd: () => {
        console.log('Word speech completed:', word.word);
        this.clearFallbackTimer();
        this.scheduleAutoAdvance();
      },
      onError: (error) => {
        console.error('Word speech error:', error);
        this.clearFallbackTimer();
        this.scheduleAutoAdvance();
      },
      onCancel: () => {
        console.log('Word speech canceled, resetting state');
        this.clearFallbackTimer();
      }
    });
  }

  private scheduleAutoAdvance(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
    }
    
    this.autoAdvanceTimer = window.setTimeout(() => {
      console.log('Auto-advance timer triggered');
      if (this.wordCompleteCallback) {
        this.wordCompleteCallback();
      }
    }, 2000);
  }

  stop(): void {
    realSpeechService.stop();
    this.clearFallbackTimer();
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
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
    console.log('Setting word complete callback:', callback ? 'set' : 'cleared');
    this.wordCompleteCallback = callback;
  }

  subscribe(callback: (state: any) => void) {
    // Return empty unsubscribe function for compatibility
    return () => {};
  }
}

export const unifiedSpeechController = new UnifiedSpeechController();
