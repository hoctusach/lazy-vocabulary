
import { VocabularyWord } from '@/types/vocabulary';
import { SpeechStateManager } from './SpeechStateManager';
import { AutoAdvanceTimer } from './AutoAdvanceTimer';
import { VoiceManager } from './VoiceManager';
import { isMobileDevice } from '@/utils/device';
import { directSpeechService } from '../directSpeechService';
import { toast } from 'sonner';

/**
 * Handles the actual speech synthesis execution
 */
export class SpeechExecutor {
  private isStopping = false;
  private cancelledUtterance: SpeechSynthesisUtterance | null = null;

  constructor(
    private stateManager: SpeechStateManager,
    private autoAdvanceTimer: AutoAdvanceTimer,
    private voiceManager: VoiceManager
  ) {}

  // Main speak method
  async speak(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    console.log(`[SPEECH-EXECUTOR] Speaking word: ${word.word}`);

    // Clear any existing auto-advance timer before starting new speech
    this.autoAdvanceTimer.clear();

    const state = this.stateManager.getState();

    // Check if we can speak
    if (state.isMuted) {
      console.log('[SPEECH-EXECUTOR] Skipping - muted, scheduling auto-advance');
      this.autoAdvanceTimer.schedule(3000, state.isPaused, state.isMuted);
      return false;
    }

    if (state.isPaused) {
      console.log('[SPEECH-EXECUTOR] Skipping - paused');
      return false;
    }

    if (state.isActive || state.currentUtterance) {
      console.log('[SPEECH-EXECUTOR] Cancelling existing utterance before speaking');
      this.stop();
      // Wait briefly for cancellation to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check browser support
    if (!window.speechSynthesis) {
      console.error('[SPEECH-EXECUTOR] Speech synthesis not supported');
      this.autoAdvanceTimer.schedule(2000, state.isPaused, state.isMuted);
      return false;
    }

    return this.executeSpeech(word, voiceRegion);
  }

  private async executeSpeech(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU'): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // On mobile devices, use the direct speech service which speaks each
        // part separately. This avoids issues where only the first word is
        // spoken on some mobile browsers.
        if (isMobileDevice()) {
          directSpeechService.speak('', {
            voiceRegion,
            word: word.word,
            meaning: word.meaning,
            example: word.example,
            onStart: () => {
              this.stateManager.updateState({
                isActive: true,
                currentWord: word,
                currentUtterance: null
              });
            },
            onEnd: () => {
              this.resetState();
              const state = this.stateManager.getState();
              this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
              resolve(true);
            },
            onError: () => {
              this.resetState();
              const state = this.stateManager.getState();
              this.autoAdvanceTimer.schedule(2000, state.isPaused, state.isMuted);
              resolve(false);
            }
          });
          return;
        }

        const speechText = this.voiceManager.createSpeechText(word);
        const utterance = new SpeechSynthesisUtterance(speechText);
        
        // Configure utterance
        const voice = this.voiceManager.findVoice(voiceRegion);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Set up event handlers
        this.setupUtteranceEvents(utterance, word, resolve);

        // Store current utterance and start speaking
        this.stateManager.setCurrentUtterance(utterance);
        this.isStopping = false;
        this.cancelledUtterance = null;
        console.log('[SPEECH-EXECUTOR] -> invoking window.speechSynthesis.speak');
        window.speechSynthesis.speak(utterance);

        // Fallback timeout
        setTimeout(() => {
          if (this.stateManager.getState().currentUtterance === utterance && !this.stateManager.getState().isActive) {
            console.warn('[SPEECH-EXECUTOR] Speech may have failed silently');
            toast.error('Audio blocked—click anywhere to enable sound.');
            resolve(false);
          }
        }, 1000);

      } catch (error) {
        console.error('[SPEECH-EXECUTOR] Error in speak method:', error);
        this.resetState();
        this.autoAdvanceTimer.schedule(2000, this.stateManager.getState().isPaused, this.stateManager.getState().isMuted);
        resolve(false);
      }
    });
  }

  private setupUtteranceEvents(
    utterance: SpeechSynthesisUtterance, 
    word: VocabularyWord, 
    resolve: (value: boolean) => void
  ): void {
    utterance.onstart = () => {
      console.log(`[SPEECH-EXECUTOR] ✓ Speech started for: ${word.word}`);
      this.stateManager.updateState({
        isActive: true,
        currentWord: word,
        currentUtterance: utterance
      });
    };

    utterance.onend = () => {
      console.log(`[SPEECH-EXECUTOR] ✓ Speech completed for: ${word.word}`);
      this.resetState();
      
      // Schedule auto-advance after speech completes
      const state = this.stateManager.getState();
      this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
      resolve(true);
    };

    utterance.onerror = (event) => {
      console.error(`[SPEECH-EXECUTOR] ✗ Speech error:`, event.error);
      this.handleSpeechError(event, utterance, resolve);
    };
  }

  private handleSpeechError(
    event: SpeechSynthesisErrorEvent, 
    utterance: SpeechSynthesisUtterance, 
    resolve: (value: boolean) => void
  ): void {
    this.resetState();
    this.autoAdvanceTimer.clear();

    const wasManual = (this.isStopping || this.cancelledUtterance === utterance) && event.error === 'canceled';

    if (wasManual) {
      console.log('[SPEECH-EXECUTOR] Speech was canceled manually');
      this.isStopping = false;
      this.cancelledUtterance = null;
      return resolve(false);
    }

    if (event.error === 'canceled') {
      console.log('[SPEECH-EXECUTOR] Speech was canceled unexpectedly, advancing');
      const state = this.stateManager.getState();
      this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
      this.isStopping = false;
      this.cancelledUtterance = null;
      return resolve(false);
    }

    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[SPEECH-EXECUTOR] Failed to reset speech synthesis', e);
    }

    const state = this.stateManager.getState();
    this.autoAdvanceTimer.schedule(2000, state.isPaused, state.isMuted);
    this.isStopping = false;
    this.cancelledUtterance = null;
    resolve(false);
  }

  // Stop speech with proper cleanup
  stop(): void {
    console.log('[SPEECH-EXECUTOR] Stopping speech');

    this.autoAdvanceTimer.clear();
    this.isStopping = true;
    this.cancelledUtterance = this.stateManager.getState().currentUtterance;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Clear utterance callbacks
    const currentUtterance = this.stateManager.getState().currentUtterance;
    if (currentUtterance) {
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
      currentUtterance.onstart = null;
    }

    this.resetState();
  }

  // Pause speech
  pause(): void {
    console.log('[SPEECH-EXECUTOR] Pausing speech');
    this.autoAdvanceTimer.clear();
    
    if (this.stateManager.getState().isActive && window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
    }
    
    this.stateManager.setPaused(true);
  }

  // Resume speech
  resume(): void {
    console.log('[SPEECH-EXECUTOR] Resuming speech');
    
    this.stateManager.setPaused(false);
    
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }

  // Toggle mute
  setMuted(muted: boolean): void {
    console.log(`[SPEECH-EXECUTOR] Setting muted: ${muted}`);
    
    if (muted && this.stateManager.getState().isActive) {
      this.stop();
    } else if (muted) {
      this.autoAdvanceTimer.clear();
    }
    
    this.stateManager.setMuted(muted);
  }

  private resetState(): void {
    this.stateManager.updateState({
      isActive: false,
      currentWord: null,
      currentUtterance: null
    });
    this.isStopping = false;
    this.cancelledUtterance = null;
  }

  // Cleanup method
  destroy(): void {
    this.autoAdvanceTimer.clear();
    this.stop();
  }
}
