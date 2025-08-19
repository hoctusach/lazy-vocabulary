
import { VocabularyWord } from '@/types/vocabulary';
import { realSpeechService } from './realSpeechService';
import { getSpeechRate } from '@/utils/speech/core/speechSettings';

const DEBUG_SPEECH = (window as any).DEBUG_SPEECH;

interface SpeechGuardResult {
  canPlay: boolean;
  reason?: string;
}

class UnifiedSpeechController {
  private wordCompleteCallback: (() => void) | null = null;
  private isMutedState = false;
  private queue: Array<{ word: VocabularyWord; voiceName: string; resolve: (v: boolean) => void; epoch: number }> = [];
  private isSpeaking = false;
  private playbackEpoch = 0;
  private timers: Set<number> = new Set();

  getMuted(): boolean {
    return this.isMutedState;
  }

  currentEpoch(): number {
    return this.playbackEpoch;
  }

  canSpeak(epoch?: number): boolean {
    return !this.isMutedState && (epoch === undefined || epoch === this.playbackEpoch);
  }

  registerTimer(id: number): void {
    this.timers.add(id);
  }

  unregisterTimer(id: number): void {
    if (this.timers.has(id)) {
      this.timers.delete(id);
    }
  }

  clearAllTimers(): void {
    this.timers.forEach(id => clearTimeout(id));
    this.timers.clear();
  }

  private hardStop(): void {
    try {
      const synth = window.speechSynthesis;
      if (synth) {
        try {
          synth.cancel();
          if (synth.speaking) {
            synth.pause();
            setTimeout(() => synth.cancel(), 0);
          }
        } catch {
          try {
            synth.pause();
            setTimeout(() => synth.cancel(), 0);
          } catch {}
        }
      }
    } catch {}
    if (DEBUG_SPEECH) {
      console.log('[speech] hardStop -> epoch', this.playbackEpoch + 1);
    }
    this.playbackEpoch++;
    this.clearAllTimers();
    this.queue = [];
    this.isSpeaking = false;
  }

  async speak(
    word: VocabularyWord,
    voiceName: string
  ): Promise<boolean> {
    return new Promise(resolve => {
      const epoch = this.currentEpoch();
      if (!this.canSpeak(epoch)) {
        resolve(false);
        return;
      }
      this.queue.push({ word, voiceName, resolve, epoch });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.isSpeaking || this.queue.length === 0) return;

    const { word, voiceName, resolve, epoch } = this.queue.shift()!;
    if (!this.canSpeak(epoch)) {
      resolve(false);
      return;
    }
    const parts = [word.word, word.meaning, word.example]
      .filter(Boolean)
      .map(part => part.trim());
    const text = parts.join('. ');
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      if (DEBUG_SPEECH) console.log('Speech engine busy, waiting to speak');
      this.queue.unshift({ word, voiceName, resolve, epoch });
      window.speechSynthesis.cancel();
      const id = window.setTimeout(() => {
        this.unregisterTimer(id);
        this.processQueue();
      }, 100);
      this.registerTimer(id);
      return;
    }

    if (DEBUG_SPEECH) {
      console.log('UnifiedSpeechController: Speaking word:', word.word, 'with voice:', voiceName);
      console.log('Selected speech rate:', getSpeechRate());
      console.log('Queue length:', this.queue.length);
    }

    this.isSpeaking = true;

    realSpeechService.speak(text, {
      voiceName,
      muted: this.isMutedState,
      epoch,
      onStart: () => {
        if (!this.canSpeak(epoch)) return;
        if (DEBUG_SPEECH) console.log('Word speech started:', word.word, 'epoch', epoch);
      },
      onEnd: () => {
        if (!this.canSpeak(epoch)) return;
        if (DEBUG_SPEECH) console.log('Word speech completed:', word.word, 'epoch', epoch);
        this.isSpeaking = false;
        if (this.wordCompleteCallback) {
          this.wordCompleteCallback();
        }
        resolve(true);
        this.processQueue();
      },
      onError: (error) => {
        if (!this.canSpeak(epoch)) return;
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

  speakGuard(): SpeechGuardResult {
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
    if (muted === this.isMutedState) return;
    if (DEBUG_SPEECH) console.log('Setting muted state:', muted);
    this.isMutedState = muted;
    if (muted) {
      this.hardStop();
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
