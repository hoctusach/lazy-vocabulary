
import { VocabularyWord } from '@/types/vocabulary';
import { SpeechOptions } from './SpeechOptions';
import { syllableTimingService } from '../syllableTimingService';

const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now());

/**
 * Handles speech synthesis events
 */
export class SpeechEventHandler {
  setupUtteranceEvents(
    utterance: SpeechSynthesisUtterance,
    word: VocabularyWord,
    speechId: string,
    resolve: (value: boolean) => void,
    onStateUpdate: (updates: any) => void,
    onReset: () => void,
    onScheduleAdvance: (delay: number, isPaused: boolean, isMuted: boolean) => void,
    getState: () => any,
    isStopping: () => boolean,
    getCancelledUtterance: () => SpeechSynthesisUtterance | null,
    resetRetryCount: () => void,
    options?: SpeechOptions
  ): void {
    let speechStartTime: number | null = null;

    utterance.onstart = () => {
      if (isStopping() || getCancelledUtterance() === utterance) {
        console.log(`[SPEECH-EVENT-${speechId}] Speech cancelled before start`);
        return;
      }

      console.log(`[SPEECH-EVENT-${speechId}] ✓ Speech started for: ${word.word}`);
      speechStartTime = now();
      onStateUpdate({
        phase: 'speaking',
        isActive: true,
        currentWord: word,
        currentUtterance: utterance
      });
      resetRetryCount();
      
      if (options?.onStart) {
        options.onStart();
      }
    };

    utterance.onend = () => {
      if (isStopping() || getCancelledUtterance() === utterance) {
        console.log(`[SPEECH-EVENT-${speechId}] Speech end was due to cancellation`);
        return;
      }

      console.log(`[SPEECH-EVENT-${speechId}] ✓ Speech completed for: ${word.word}`);
      const elapsed = speechStartTime !== null ? now() - speechStartTime : null;
      onReset();
      onStateUpdate({ phase: 'finished' });
      const state = getState();
      if (!state.isMuted && elapsed && elapsed > 0) {
        syllableTimingService.recordWordSample(word, elapsed);
      }
      onScheduleAdvance(1500, state.isPaused, state.isMuted);

      if (options?.onEnd) {
        options.onEnd();
      }
      
      resolve(true);
    };

    utterance.onerror = (event) => {
      console.error(`[SPEECH-EVENT-${speechId}] ✗ Speech error: ${event.error}`);
      
      const wasManual = (isStopping() || getCancelledUtterance() === utterance) && event.error === 'canceled';
      
      if (wasManual) {
        console.log(`[SPEECH-EVENT-${speechId}] Error was due to manual cancellation`);
        onReset();
        resolve(false);
        return;
      }

      this.handleUtteranceError(event, utterance, speechId, resolve, onReset, onStateUpdate, onScheduleAdvance, getState, resetRetryCount, options);
    };

    utterance.onpause = () => {
      console.log(`[SPEECH-EVENT-${speechId}] Speech paused`);
      onStateUpdate({ isPaused: true });
    };

    utterance.onresume = () => {
      console.log(`[SPEECH-EVENT-${speechId}] Speech resumed`);
      onStateUpdate({ isPaused: false });
    };
  }

  private handleUtteranceError(
    event: SpeechSynthesisErrorEvent,
    utterance: SpeechSynthesisUtterance,
    speechId: string,
    resolve: (value: boolean) => void,
    onReset: () => void,
    onStateUpdate: (updates: any) => void,
    onScheduleAdvance: (delay: number, isPaused: boolean, isMuted: boolean) => void,
    getState: () => any,
    resetRetryCount: () => void,
    options?: SpeechOptions
  ): void {
    console.log(`[SPEECH-EVENT-${speechId}] Handling utterance error, advancing immediately`);
    onReset();
    onStateUpdate({ phase: 'finished' });
    resetRetryCount();
    
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn(`[SPEECH-EVENT-${speechId}] Failed to reset speech synthesis`, e);
    }

    if (options?.onError) {
      // Pass the original SpeechSynthesisErrorEvent
      options.onError(event);
    }

    const state = getState();
    onScheduleAdvance(1500, state.isPaused, state.isMuted);
    resolve(false);
  }
}
