import { VocabularyWord } from '@/types/vocabulary';
import { SpeechOptions } from './SpeechOptions';
import { VoiceManager } from './VoiceManager';
import { SpeechEventHandler } from './SpeechEventHandler';
import { isMobileDevice } from '@/utils/device';
import { directSpeechService } from '../directSpeechService';

/**
 * Manages platform-specific speech execution (mobile vs desktop)
 */
export class SpeechPlatformManager {
  constructor(
    private voiceManager: VoiceManager,
    private eventHandler: SpeechEventHandler
  ) {}

  executeMobileSpeech(
    word: VocabularyWord,
    voiceRegion: 'US' | 'UK' | 'AU',
    speechId: string,
    resolve: (value: boolean) => void,
    onStateUpdate: (updates: any) => void,
    onReset: () => void,
    onScheduleAdvance: (delay: number, isPaused: boolean, isMuted: boolean) => void,
    getState: () => any,
    resetRetryCount: () => void,
    options?: SpeechOptions
  ): void {
    const speechText = this.voiceManager.createSpeechText(word);
    directSpeechService.speak(speechText, {
      voiceRegion,
      onStart: () => {
        console.log(`[SPEECH-PLATFORM-${speechId}] ✓ Mobile speech started`);
        onStateUpdate({
          phase: 'speaking',
          isActive: true,
          currentWord: word,
          currentUtterance: null
        });
        resetRetryCount();
        
        options?.onStart?.();
      },
      onEnd: () => {
        console.log(`[SPEECH-PLATFORM-${speechId}] ✓ Mobile speech completed`);
        onReset();
        onStateUpdate({ phase: 'finished' });
        const state = getState();
        onScheduleAdvance(1500, state.isPaused, state.isMuted);
        
        options?.onEnd?.();
        
        resolve(true);
      },
      onError: (error) => {
        console.error(`[SPEECH-PLATFORM-${speechId}] Mobile speech error:`, error);
        this.handleMobileSpeechError(resolve, speechId, onReset, onStateUpdate, onScheduleAdvance, getState, resetRetryCount, options);
      }
    });
  }

  executeDesktopSpeech(
    word: VocabularyWord,
    voiceRegion: 'US' | 'UK' | 'AU',
    speechId: string,
    resolve: (value: boolean) => void,
    onStateUpdate: (updates: any) => void,
    onReset: () => void,
    onScheduleAdvance: (delay: number, isPaused: boolean, isMuted: boolean) => void,
    getState: () => any,
    setCurrentUtterance: (utterance: SpeechSynthesisUtterance | null) => void,
    isStopping: () => boolean,
    getCancelledUtterance: () => SpeechSynthesisUtterance | null,
    setCancelledUtterance: (utterance: SpeechSynthesisUtterance | null) => void,
    resetRetryCount: () => void,
    options?: SpeechOptions
  ): void {
    const speechText = this.voiceManager.createSpeechText(word);
    const utterance = new SpeechSynthesisUtterance(speechText);
    
    const voice = this.voiceManager.findVoice(voiceRegion);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.eventHandler.setupUtteranceEvents(
      utterance,
      word,
      speechId,
      resolve,
      onStateUpdate,
      onReset,
      onScheduleAdvance,
      getState,
      isStopping,
      getCancelledUtterance,
      resetRetryCount,
      options
    );

    setCurrentUtterance(utterance);
    setCancelledUtterance(null);
    
    console.log(`[SPEECH-PLATFORM-${speechId}] -> invoking window.speechSynthesis.speak`);
    
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      console.log(`[SPEECH-PLATFORM-${speechId}] Canceling existing speech before new utterance`);
      window.speechSynthesis.cancel();
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 300);
    } else {
      window.speechSynthesis.speak(utterance);
    }

    setTimeout(() => {
      if (getState().currentUtterance === utterance && 
          !window.speechSynthesis.speaking && 
          !getState().isActive) {
        console.warn(`[SPEECH-PLATFORM-${speechId}] Speech timeout, advancing`);
        this.handleSpeechTimeout(resolve, speechId, onReset, onStateUpdate, onScheduleAdvance, getState, resetRetryCount);
      }
    }, 3000);
  }

  private handleMobileSpeechError(
    resolve: (value: boolean) => void,
    speechId: string,
    onReset: () => void,
    onStateUpdate: (updates: any) => void,
    onScheduleAdvance: (delay: number, isPaused: boolean, isMuted: boolean) => void,
    getState: () => any,
    resetRetryCount: () => void,
    options?: SpeechOptions
  ): void {
    console.log(`[SPEECH-PLATFORM-${speechId}] Mobile speech error - advancing`);
    onReset();
    onStateUpdate({ phase: 'finished' });
    resetRetryCount();
    
    if (options?.onError) {
      options.onError(new Error('Mobile speech error'));
    }
    
    const state = getState();
    onScheduleAdvance(1500, state.isPaused, state.isMuted);
    resolve(false);
  }

  private handleSpeechTimeout(
    resolve: (value: boolean) => void,
    speechId: string,
    onReset: () => void,
    onStateUpdate: (updates: any) => void,
    onScheduleAdvance: (delay: number, isPaused: boolean, isMuted: boolean) => void,
    getState: () => any,
    resetRetryCount: () => void
  ): void {
    console.log(`[SPEECH-PLATFORM-${speechId}] Speech timeout - advancing`);
    onReset();
    onStateUpdate({ phase: 'finished' });
    resetRetryCount();
    onScheduleAdvance(1500, getState().isPaused, getState().isMuted);
    resolve(false);
  }
}
