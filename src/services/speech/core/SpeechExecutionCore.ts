
import { VocabularyWord } from '@/types/vocabulary';
import { SpeechOptions } from './SpeechOptions';
import { SpeechStateManager } from './SpeechStateManager';
import { AutoAdvanceTimer } from './AutoAdvanceTimer';
import { VoiceManager } from './VoiceManager';
import { SpeechGuard } from './SpeechGuard';
import { SpeechEventHandler } from './SpeechEventHandler';
import { SpeechPlatformManager } from './SpeechPlatformManager';
import { isMobileDevice } from '@/utils/device';

/**
 * Core speech execution logic
 */
export class SpeechExecutionCore {
  private isStopping = false;
  private cancelledUtterance: SpeechSynthesisUtterance | null = null;
  private lastStopTime = 0;
  private lastSpeakTime = 0;
  private readonly MIN_STOP_INTERVAL = 300;
  private readonly MIN_SPEAK_INTERVAL = 500;
  private retryCount = 0;
  private readonly MAX_RETRIES = 1;
  private currentSpeechPromise: Promise<boolean> | null = null;
  private isExecuting = false;
  private guard: SpeechGuard;
  private speechAttemptId = 0;
  private eventHandler: SpeechEventHandler;
  private platformManager: SpeechPlatformManager;

  constructor(
    private stateManager: SpeechStateManager,
    private autoAdvanceTimer: AutoAdvanceTimer,
    private voiceManager: VoiceManager
  ) {
    this.guard = new SpeechGuard(this.stateManager);
    this.eventHandler = new SpeechEventHandler();
    this.platformManager = new SpeechPlatformManager(this.voiceManager, this.eventHandler);
  }

  async speak(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU' = 'US', options?: SpeechOptions): Promise<boolean> {
    const now = Date.now();
    const speechId = `speech-${++this.speechAttemptId}`;
    
    console.log(`[SPEECH-CORE-${speechId}] Starting speech request for: ${word.word}`);

    if (this.isExecuting) {
      console.log(`[SPEECH-CORE-${speechId}] Speech already executing, rejecting`);
      return false;
    }

    if (now - this.lastSpeakTime < this.MIN_SPEAK_INTERVAL) {
      console.log(`[SPEECH-CORE-${speechId}] Rate limited - too soon after last call`);
      return false;
    }
    this.lastSpeakTime = now;

    if (this.currentSpeechPromise) {
      console.log(`[SPEECH-CORE-${speechId}] Waiting for previous speech to complete`);
      try {
        await this.currentSpeechPromise;
      } catch (e) {
        console.log(`[SPEECH-CORE-${speechId}] Previous speech completed with error`);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const guardCheck = this.guard.canPlay();
    if (!guardCheck.canPlay) {
      console.log(`[SPEECH-CORE-${speechId}] Guard check failed: ${guardCheck.reason}`);
      return false;
    }

    this.stateManager.setPhase('preparing');
    this.isExecuting = true;

    try {
      this.currentSpeechPromise = this.executeSpeech(word, voiceRegion, speechId, options);
      const result = await this.currentSpeechPromise;
      return result;
    } finally {
      this.currentSpeechPromise = null;
      this.isExecuting = false;
    }
  }

  private async executeSpeech(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU', speechId: string, options?: SpeechOptions): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.autoAdvanceTimer.clear();

        const state = this.stateManager.getState();

        if (state.isActive || state.currentUtterance) {
          console.log(`[SPEECH-CORE-${speechId}] Stopping existing utterance`);
          this.stopInternal();
          const stopDelay = isMobileDevice() ? 400 : 200;
          setTimeout(() => this.proceedWithSpeech(word, voiceRegion, speechId, resolve, options), stopDelay);
        } else {
          this.proceedWithSpeech(word, voiceRegion, speechId, resolve, options);
        }
      } catch (error) {
        console.error(`[SPEECH-CORE-${speechId}] Error in executeSpeech:`, error);
        this.handleSpeechError(resolve, speechId);
      }
    });
  }

  private proceedWithSpeech(
    word: VocabularyWord, 
    voiceRegion: 'US' | 'UK' | 'AU', 
    speechId: string, 
    resolve: (value: boolean) => void,
    options?: SpeechOptions
  ): void {
    try {
      if (!window.speechSynthesis) {
        console.error(`[SPEECH-CORE-${speechId}] Speech synthesis not supported`);
        this.handleSpeechError(resolve, speechId);
        return;
      }

      const onStateUpdate = (updates: any) => this.stateManager.updateState(updates);
      const onReset = () => this.resetState();
      const onScheduleAdvance = (delay: number, isPaused: boolean, isMuted: boolean) => 
        this.autoAdvanceTimer.schedule(delay, isPaused, isMuted);
      const getState = () => this.stateManager.getState();

      if (isMobileDevice()) {
        console.log(`[SPEECH-CORE-${speechId}] Using mobile direct speech service`);
        this.platformManager.executeMobileSpeech(
          word, voiceRegion, speechId, resolve, onStateUpdate, onReset, 
          onScheduleAdvance, getState, () => this.retryCount = 0, options
        );
        return;
      }

      this.platformManager.executeDesktopSpeech(
        word, voiceRegion, speechId, resolve, onStateUpdate, onReset,
        onScheduleAdvance, getState, 
        (utterance) => this.stateManager.setCurrentUtterance(utterance),
        () => this.isStopping,
        () => this.cancelledUtterance,
        (utterance) => { this.cancelledUtterance = utterance; },
        () => this.retryCount = 0,
        options
      );

    } catch (error) {
      console.error(`[SPEECH-CORE-${speechId}] Error in proceedWithSpeech:`, error);
      this.handleSpeechError(resolve, speechId);
    }
  }

  private handleSpeechError(resolve: (value: boolean) => void, speechId: string): void {
    this.resetState();
    this.stateManager.setPhase('finished');
    this.retryCount = 0;
    this.autoAdvanceTimer.schedule(1500, this.stateManager.getState().isPaused, this.stateManager.getState().isMuted);
    resolve(false);
  }

  stop(): void {
    const now = Date.now();
    if (now - this.lastStopTime < this.MIN_STOP_INTERVAL) {
      console.log('[SPEECH-CORE] Stop call debounced');
      return;
    }
    this.lastStopTime = now;

    this.stopInternal();
  }

  private stopInternal(): void {
    console.log('[SPEECH-CORE] Stopping speech');

    this.autoAdvanceTimer.clear();
    this.isStopping = true;
    this.cancelledUtterance = this.stateManager.getState().currentUtterance;
    this.retryCount = 0;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const currentUtterance = this.stateManager.getState().currentUtterance;
    if (currentUtterance) {
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
      currentUtterance.onstart = null;
    }

    this.resetState();
    this.stateManager.setPhase('idle');
  }

  pause(): void {
    console.log('[SPEECH-CORE] Pausing speech');
    this.autoAdvanceTimer.clear();
    
    if (this.stateManager.getState().isActive && window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
    }
    
    this.stateManager.setPaused(true);
  }

  resume(): void {
    console.log('[SPEECH-CORE] Resuming speech');
    
    this.stateManager.setPaused(false);
    
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }

  setMuted(muted: boolean): void {
    console.log(`[SPEECH-CORE] Setting muted: ${muted}`);
    this.stateManager.setMuted(muted);
  }

  private resetState(): void {
    this.stateManager.updateState({
      phase: 'idle',
      isActive: false,
      currentWord: null,
      currentUtterance: null
    });
    this.isStopping = false;
    this.cancelledUtterance = null;
  }

  destroy(): void {
    this.autoAdvanceTimer.clear();
    this.stopInternal();
    this.isExecuting = false;
    this.currentSpeechPromise = null;
  }
}
