
import { VocabularyWord } from '@/types/vocabulary';
import { realSpeechService } from './realSpeechService';
import { getSpeechRate } from '@/utils/speech/core/speechSettings';

interface SpeechGuardResult {
  canPlay: boolean;
  reason?: string;
}

class UnifiedSpeechController {
  private wordCompleteCallback: (() => void) | null = null;
  private isMutedState = false;
  private queue: Array<{ word: VocabularyWord; voiceName: string; resolve: (v: boolean) => void }> = [];
  private isSpeaking = false;

  async speak(
    word: VocabularyWord,
    voiceName: string
  ): Promise<boolean> {
    return new Promise(resolve => {
      this.queue.push({ word, voiceName, resolve });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.isSpeaking || this.queue.length === 0) return;

    const { word, voiceName, resolve } = this.queue.shift()!;
    const parts = [word.word, word.meaning, word.example]
      .filter(Boolean)
      .map(part => part.trim());
    const text = parts.join('. ');

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      console.log('Speech engine busy, waiting to speak');
      this.queue.unshift({ word, voiceName, resolve });
      window.speechSynthesis.cancel();
      setTimeout(() => this.processQueue(), 100);
      return;
    }

    console.log('UnifiedSpeechController: Speaking word:', word.word, 'with voice:', voiceName);
    console.log('Selected speech rate:', getSpeechRate());
    console.log('Queue length:', this.queue.length);

    this.isSpeaking = true;

    realSpeechService.speak(text, {
      voiceName,
      muted: this.isMutedState,
      onStart: () => {
        console.log('Word speech started:', word.word);
      },
      onEnd: () => {
        console.log('Word speech completed:', word.word);
        this.isSpeaking = false;
        if (this.wordCompleteCallback) {
          this.wordCompleteCallback();
        }
        resolve(true);
        this.processQueue();
      },
      onError: (error) => {
        if ((error as SpeechSynthesisErrorEvent).error === 'not-allowed') {
          window.dispatchEvent(new Event('speechblocked'));
          this.isSpeaking = false;
          resolve(false);
          return;
        }
        this.isSpeaking = false;
        if (this.wordCompleteCallback) {
          this.wordCompleteCallback();
        }
        resolve(false);
        this.processQueue();
      }
    });
  }

  stop(): void {
    realSpeechService.stop();
    this.isSpeaking = false;
    this.queue = [];
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
    realSpeechService.setMuted(muted);
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
