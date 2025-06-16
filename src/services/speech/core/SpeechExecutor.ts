
import { VocabularyWord } from '@/types/vocabulary';
import { SpeechStateManager } from './SpeechStateManager';
import { AutoAdvanceTimer } from './AutoAdvanceTimer';
import { VoiceManager } from './VoiceManager';
import { SpeechGuard } from './SpeechGuard';
import { isMobileDevice } from '@/utils/device';
import { directSpeechService } from '../directSpeechService';
import { mobileAudioManager } from '@/utils/audio/mobileAudioManager';
import { audioUnlockService } from '@/services/audio/AudioUnlockService';

/**
 * Enhanced Speech Executor with improved cancellation handling and mobile support
 * Fixed to prevent speech conflicts and cancellation loops
 */
export class SpeechExecutor {
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

  constructor(
    private stateManager: SpeechStateManager,
    private autoAdvanceTimer: AutoAdvanceTimer,
    private voiceManager: VoiceManager
  ) {
    this.guard = new SpeechGuard(this.stateManager);
  }

  async speak(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    const now = Date.now();
    const speechId = `speech-${++this.speechAttemptId}`;
    
    console.log(`[SPEECH-EXECUTOR-${speechId}] Starting speech request for: ${word.word}`);

    // Prevent overlapping executions
    if (this.isExecuting) {
      console.log(`[SPEECH-EXECUTOR-${speechId}] Speech already executing, rejecting`);
      return false;
    }

    // Prevent rapid speak calls
    if (now - this.lastSpeakTime < this.MIN_SPEAK_INTERVAL) {
      console.log(`[SPEECH-EXECUTOR-${speechId}] Rate limited - too soon after last call`);
      return false;
    }
    this.lastSpeakTime = now;

    // Ensure audio is unlocked before proceeding
    if (!audioUnlockService.hasValidUserGesture()) {
      console.log(`[SPEECH-EXECUTOR-${speechId}] No user gesture detected yet`);
      return false;
    }

    // Try to unlock audio if not already done
    const audioUnlocked = await audioUnlockService.unlock();
    if (!audioUnlocked) {
      console.warn(`[SPEECH-EXECUTOR-${speechId}] Audio unlock failed`);
      // Schedule retry instead of immediate failure
      this.autoAdvanceTimer.schedule(2000, false, false);
      return false;
    }

    // Wait for any existing speech to complete
    if (this.currentSpeechPromise) {
      console.log(`[SPEECH-EXECUTOR-${speechId}] Waiting for previous speech to complete`);
      try {
        await this.currentSpeechPromise;
      } catch (e) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Previous speech completed with error`);
      }
      // Add delay to ensure clean transition
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const guardCheck = this.guard.canPlay();
    if (!guardCheck.canPlay) {
      console.log(`[SPEECH-EXECUTOR-${speechId}] Guard check failed: ${guardCheck.reason}`);
      return false;
    }

    this.stateManager.setPhase('preparing');
    this.isExecuting = true;

    // Ensure the unlock process has fully completed before speaking
    console.log(`[SPEECH-EXECUTOR-${speechId}] Waiting for audio unlock completion`);
    await audioUnlockService.unlock();

    try {
      this.currentSpeechPromise = this.executeSpeech(word, voiceRegion, speechId);
      const result = await this.currentSpeechPromise;
      return result;
    } finally {
      this.currentSpeechPromise = null;
      this.isExecuting = false;
    }
  }

  private async executeSpeech(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU', speechId: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Clear any existing auto-advance timer
        this.autoAdvanceTimer.clear();

        const state = this.stateManager.getState();

        // Stop any existing speech with proper cleanup
        if (state.isActive || state.currentUtterance) {
          console.log(`[SPEECH-EXECUTOR-${speechId}] Stopping existing utterance`);
          this.stopInternal();
          // Longer delay for clean stop on mobile
          const stopDelay = isMobileDevice() ? 400 : 200;
          setTimeout(() => this.proceedWithSpeech(word, voiceRegion, speechId, resolve), stopDelay);
        } else {
          this.proceedWithSpeech(word, voiceRegion, speechId, resolve);
        }
      } catch (error) {
        console.error(`[SPEECH-EXECUTOR-${speechId}] Error in executeSpeech:`, error);
        this.handleSpeechError(resolve, speechId);
      }
    });
  }

  private proceedWithSpeech(
    word: VocabularyWord, 
    voiceRegion: 'US' | 'UK' | 'AU', 
    speechId: string, 
    resolve: (value: boolean) => void
  ): void {
    try {
      // Check browser support
      if (!window.speechSynthesis) {
        console.error(`[SPEECH-EXECUTOR-${speechId}] Speech synthesis not supported`);
        this.handleSpeechError(resolve, speechId);
        return;
      }

      // On mobile devices, use direct speech service for better reliability
      if (isMobileDevice()) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Using mobile direct speech service`);
        this.executeMobileSpeech(word, voiceRegion, speechId, resolve);
        return;
      }

      // Desktop speech synthesis
      this.executeDesktopSpeech(word, voiceRegion, speechId, resolve);

    } catch (error) {
      console.error(`[SPEECH-EXECUTOR-${speechId}] Error in proceedWithSpeech:`, error);
      this.handleSpeechError(resolve, speechId);
    }
  }

  private executeMobileSpeech(
    word: VocabularyWord, 
    voiceRegion: 'US' | 'UK' | 'AU', 
    speechId: string, 
    resolve: (value: boolean) => void
  ): void {
    directSpeechService.speak('', {
      voiceRegion,
      word: word.word,
      meaning: word.meaning,
      example: word.example,
      onStart: () => {
        console.log(`[SPEECH-EXECUTOR-${speechId}] ✓ Mobile speech started`);
        this.stateManager.updateState({
          phase: 'speaking',
          isActive: true,
          currentWord: word,
          currentUtterance: null
        });
        this.retryCount = 0;
      },
      onEnd: () => {
        console.log(`[SPEECH-EXECUTOR-${speechId}] ✓ Mobile speech completed`);
        this.resetState();
        this.stateManager.setPhase('finished');
        const state = this.stateManager.getState();
        this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
        resolve(true);
      },
      onError: (error) => {
        console.error(`[SPEECH-EXECUTOR-${speechId}] Mobile speech error:`, error);
        this.handleMobileSpeechError(resolve, speechId);
      }
    });
  }

  private executeDesktopSpeech(
    word: VocabularyWord, 
    voiceRegion: 'US' | 'UK' | 'AU', 
    speechId: string, 
    resolve: (value: boolean) => void
  ): void {
    const speechText = this.voiceManager.createSpeechText(word);
    const utterance = new SpeechSynthesisUtterance(speechText);
    
    // Configure utterance
    const voice = this.voiceManager.findVoice(voiceRegion);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Set up event handlers
    this.setupUtteranceEvents(utterance, word, speechId, resolve);

    // Store current utterance and reset flags
    this.stateManager.setCurrentUtterance(utterance);
    this.isStopping = false;
    this.cancelledUtterance = null;
    
    console.log(`[SPEECH-EXECUTOR-${speechId}] -> invoking window.speechSynthesis.speak`);
    
    // Ensure speech synthesis is ready before speaking
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      console.log(`[SPEECH-EXECUTOR-${speechId}] Canceling existing speech before new utterance`);
      window.speechSynthesis.cancel();
      // Wait for cancellation to complete
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 300);
    } else {
      window.speechSynthesis.speak(utterance);
    }

    // Enhanced fallback timeout
    setTimeout(() => {
      if (this.stateManager.getState().currentUtterance === utterance && 
          !window.speechSynthesis.speaking && 
          !this.stateManager.getState().isActive) {
        console.warn(`[SPEECH-EXECUTOR-${speechId}] Speech timeout, advancing`);
        this.handleSpeechTimeout(resolve, speechId);
      }
    }, 3000);
  }

  private setupUtteranceEvents(
    utterance: SpeechSynthesisUtterance, 
    word: VocabularyWord, 
    speechId: string,
    resolve: (value: boolean) => void
  ): void {
    utterance.onstart = () => {
      if (this.isStopping || this.cancelledUtterance === utterance) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Speech cancelled before start`);
        return;
      }

      console.log(`[SPEECH-EXECUTOR-${speechId}] ✓ Speech started for: ${word.word}`);
      this.stateManager.updateState({
        phase: 'speaking',
        isActive: true,
        currentWord: word,
        currentUtterance: utterance
      });
      this.retryCount = 0;
    };

    utterance.onend = () => {
      if (this.isStopping || this.cancelledUtterance === utterance) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Speech end was due to cancellation`);
        return;
      }

      console.log(`[SPEECH-EXECUTOR-${speechId}] ✓ Speech completed for: ${word.word}`);
      this.resetState();
      this.stateManager.setPhase('finished');
      const state = this.stateManager.getState();
      this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
      resolve(true);
    };

    utterance.onerror = (event) => {
      console.error(`[SPEECH-EXECUTOR-${speechId}] ✗ Speech error: ${event.error}`);
      
      // Check if this was a manual cancellation
      const wasManual = (this.isStopping || this.cancelledUtterance === utterance) && event.error === 'canceled';
      
      if (wasManual) {
        console.log(`[SPEECH-EXECUTOR-${speechId}] Error was due to manual cancellation`);
        this.resetState();
        resolve(false);
        return;
      }

      // For other errors, advance immediately to prevent loops
      this.handleUtteranceError(event, utterance, speechId, resolve);
    };

    utterance.onpause = () => {
      console.log(`[SPEECH-EXECUTOR-${speechId}] Speech paused`);
      this.stateManager.setPaused(true);
    };

    utterance.onresume = () => {
      console.log(`[SPEECH-EXECUTOR-${speechId}] Speech resumed`);
      this.stateManager.setPaused(false);
    };
  }

  private handleUtteranceError(
    event: SpeechSynthesisErrorEvent, 
    utterance: SpeechSynthesisUtterance, 
    speechId: string,
    resolve: (value: boolean) => void
  ): void {
    console.log(`[SPEECH-EXECUTOR-${speechId}] Handling utterance error, advancing immediately`);
    this.resetState();
    this.stateManager.setPhase('finished');
    this.retryCount = 0;
    
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn(`[SPEECH-EXECUTOR-${speechId}] Failed to reset speech synthesis`, e);
    }

    const state = this.stateManager.getState();
    this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
    resolve(false);
  }

  private handleMobileSpeechError(resolve: (value: boolean) => void, speechId: string): void {
    console.log(`[SPEECH-EXECUTOR-${speechId}] Mobile speech error - advancing`);
    this.resetState();
    this.stateManager.setPhase('finished');
    this.retryCount = 0;
    const state = this.stateManager.getState();
    this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
    resolve(false);
  }

  private handleSpeechTimeout(resolve: (value: boolean) => void, speechId: string): void {
    console.log(`[SPEECH-EXECUTOR-${speechId}] Speech timeout - advancing`);
    this.resetState();
    this.stateManager.setPhase('finished');
    this.retryCount = 0;
    this.autoAdvanceTimer.schedule(1500, this.stateManager.getState().isPaused, this.stateManager.getState().isMuted);
    resolve(false);
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
      console.log('[SPEECH-EXECUTOR] Stop call debounced');
      return;
    }
    this.lastStopTime = now;

    this.stopInternal();
  }

  private stopInternal(): void {
    console.log('[SPEECH-EXECUTOR] Stopping speech');

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
    console.log('[SPEECH-EXECUTOR] Pausing speech');
    this.autoAdvanceTimer.clear();
    
    if (this.stateManager.getState().isActive && window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
    }
    
    this.stateManager.setPaused(true);
  }

  resume(): void {
    console.log('[SPEECH-EXECUTOR] Resuming speech');
    
    this.stateManager.setPaused(false);
    
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }

  setMuted(muted: boolean): void {
    console.log(`[SPEECH-EXECUTOR] Setting muted: ${muted}`);
    
    if (muted && this.stateManager.getState().isActive) {
      this.stopInternal();
    } else if (muted) {
      this.autoAdvanceTimer.clear();
    }
    
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
