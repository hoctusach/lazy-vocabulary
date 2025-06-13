import { VocabularyWord } from '@/types/vocabulary';
import { SpeechStateManager } from './SpeechStateManager';
import { AutoAdvanceTimer } from './AutoAdvanceTimer';
import { VoiceManager } from './VoiceManager';
import { isMobileDevice } from '@/utils/device';
import { directSpeechService } from '../directSpeechService';

/**
 * Enhanced Speech Executor with improved cancellation handling and mobile support
 */
export class SpeechExecutor {
  private isStopping = false;
  private cancelledUtterance: SpeechSynthesisUtterance | null = null;
  private lastStopTime = 0;
  private lastSpeakTime = 0;
  private readonly MIN_STOP_INTERVAL = 100;
  private readonly MIN_SPEAK_INTERVAL = 200;
  private retryCount = 0;
  private readonly MAX_RETRIES = 2;

  constructor(
    private stateManager: SpeechStateManager,
    private autoAdvanceTimer: AutoAdvanceTimer,
    private voiceManager: VoiceManager
  ) {}

  // Main speak method with retry logic
  async speak(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    const now = Date.now();
    
    // Prevent rapid speak calls
    if (now - this.lastSpeakTime < this.MIN_SPEAK_INTERVAL) {
      console.log('[SPEECH-EXECUTOR] Speak call debounced to prevent conflicts');
      return false;
    }
    this.lastSpeakTime = now;

    console.log(`[SPEECH-EXECUTOR] Speaking word: ${word.word} (attempt ${this.retryCount + 1})`);

    // Clear any existing auto-advance timer
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

    // Stop any existing speech with proper cleanup
    if (state.isActive || state.currentUtterance) {
      console.log('[SPEECH-EXECUTOR] Stopping existing utterance before speaking');
      this.stop();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Check browser support
    if (!window.speechSynthesis) {
      console.error('[SPEECH-EXECUTOR] Speech synthesis not supported');
      this.autoAdvanceTimer.schedule(2000, state.isPaused, state.isMuted);
      return false;
    }

    // Initialize mobile audio context if needed
    if (isMobileDevice()) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          if (audioContext.state === 'suspended') {
            console.log('[SPEECH-EXECUTOR] Resuming mobile audio context');
            await audioContext.resume();
          }
        }
      } catch (error) {
        console.warn('[SPEECH-EXECUTOR] Mobile audio context initialization failed:', error);
      }
    }

    return this.executeSpeech(word, voiceRegion);
  }

  private async executeSpeech(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU'): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // On mobile devices, use the direct speech service for better reliability
        if (isMobileDevice()) {
          console.log('[SPEECH-EXECUTOR] Using mobile direct speech service');
          directSpeechService.speak('', {
            voiceRegion,
            word: word.word,
            meaning: word.meaning,
            example: word.example,
            onStart: () => {
              console.log('[SPEECH-EXECUTOR] ✓ Mobile speech started');
              this.stateManager.updateState({
                isActive: true,
                currentWord: word,
                currentUtterance: null
              });
              this.retryCount = 0; // Reset on success
            },
            onEnd: () => {
              console.log('[SPEECH-EXECUTOR] ✓ Mobile speech completed');
              this.resetState();
              const state = this.stateManager.getState();
              this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
              resolve(true);
            },
            onError: (error) => {
              console.error('[SPEECH-EXECUTOR] Mobile speech error:', error);
              this.handleMobileSpeechError(resolve);
            }
          });
          return;
        }

        // Desktop speech synthesis with enhanced error handling
        const speechText = this.voiceManager.createSpeechText(word);
        const utterance = new SpeechSynthesisUtterance(speechText);
        
        // Configure utterance with optimized settings
        const voice = this.voiceManager.findVoice(voiceRegion);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Set up event handlers with enhanced error recovery
        this.setupUtteranceEvents(utterance, word, resolve);

        // Store current utterance and reset flags
        this.stateManager.setCurrentUtterance(utterance);
        this.isStopping = false;
        this.cancelledUtterance = null;
        
        console.log('[SPEECH-EXECUTOR] -> invoking window.speechSynthesis.speak');
        window.speechSynthesis.speak(utterance);

        // Enhanced fallback timeout with retry logic
        setTimeout(() => {
          if (this.stateManager.getState().currentUtterance === utterance && 
              !window.speechSynthesis.speaking && 
              !this.stateManager.getState().isActive) {
            console.warn('[SPEECH-EXECUTOR] Speech appears stuck, attempting recovery');
            this.handleSpeechTimeout(resolve);
          }
        }, 4000);

      } catch (error) {
        console.error('[SPEECH-EXECUTOR] Error in speak method:', error);
        this.handleSpeechError(resolve);
      }
    });
  }

  private setupUtteranceEvents(
    utterance: SpeechSynthesisUtterance, 
    word: VocabularyWord, 
    resolve: (value: boolean) => void
  ): void {
    utterance.onstart = () => {
      // Check if we were cancelled before start
      if (this.isStopping || this.cancelledUtterance === utterance) {
        console.log('[SPEECH-EXECUTOR] Speech was cancelled before start event');
        return;
      }
      
      console.log(`[SPEECH-EXECUTOR] ✓ Speech started for: ${word.word}`);
      this.stateManager.updateState({
        isActive: true,
        currentWord: word,
        currentUtterance: utterance
      });
      this.retryCount = 0; // Reset retry count on successful start
    };

    utterance.onend = () => {
      // Check if this was a manual cancellation
      if (this.isStopping || this.cancelledUtterance === utterance) {
        console.log('[SPEECH-EXECUTOR] Speech end was due to manual cancellation');
        return;
      }
      
      console.log(`[SPEECH-EXECUTOR] ✓ Speech completed for: ${word.word}`);
      this.resetState();
      
      // Schedule auto-advance after successful completion
      const state = this.stateManager.getState();
      this.autoAdvanceTimer.schedule(1500, state.isPaused, state.isMuted);
      resolve(true);
    };

    utterance.onerror = (event) => {
      console.error(`[SPEECH-EXECUTOR] ✗ Speech error: ${event.error} for word: ${word.word}`);
      this.handleUtteranceError(event, utterance, resolve);
    };
  }

  private handleUtteranceError(
    event: SpeechSynthesisErrorEvent, 
    utterance: SpeechSynthesisUtterance, 
    resolve: (value: boolean) => void
  ): void {
    const wasManual = (this.isStopping || this.cancelledUtterance === utterance) && event.error === 'canceled';

    if (wasManual) {
      console.log('[SPEECH-EXECUTOR] Speech was canceled manually');
      this.resetState();
      resolve(false);
      return;
    }

    // Handle unexpected cancellation with retry logic
    if (event.error === 'canceled' && this.retryCount < this.MAX_RETRIES) {
      console.log(`[SPEECH-EXECUTOR] Unexpected cancellation, retrying (${this.retryCount + 1}/${this.MAX_RETRIES})`);
      this.retryCount++;
      this.resetState();
      
      // Retry after a short delay
      setTimeout(() => {
        const currentWord = this.stateManager.getState().currentWord;
        if (currentWord && !this.stateManager.getState().isPaused && !this.stateManager.getState().isMuted) {
          this.speak(currentWord, 'US'); // Use default voice for retry
        }
      }, 500);
      return;
    }

    // For other errors or max retries reached, advance
    console.log('[SPEECH-EXECUTOR] Handling speech error, advancing to next word');
    this.resetState();
    this.retryCount = 0;
    
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[SPEECH-EXECUTOR] Failed to reset speech synthesis', e);
    }

    const state = this.stateManager.getState();
    this.autoAdvanceTimer.schedule(2000, state.isPaused, state.isMuted);
    resolve(false);
  }

  private handleMobileSpeechError(resolve: (value: boolean) => void): void {
    if (this.retryCount < this.MAX_RETRIES) {
      console.log(`[SPEECH-EXECUTOR] Mobile speech retry (${this.retryCount + 1}/${this.MAX_RETRIES})`);
      this.retryCount++;
      
      setTimeout(() => {
        const currentWord = this.stateManager.getState().currentWord;
        if (currentWord && !this.stateManager.getState().isPaused && !this.stateManager.getState().isMuted) {
          this.speak(currentWord, 'US');
        }
      }, 1000);
      return;
    }

    this.resetState();
    this.retryCount = 0;
    const state = this.stateManager.getState();
    this.autoAdvanceTimer.schedule(2000, state.isPaused, state.isMuted);
    resolve(false);
  }

  private handleSpeechTimeout(resolve: (value: boolean) => void): void {
    if (this.retryCount < this.MAX_RETRIES) {
      console.log(`[SPEECH-EXECUTOR] Speech timeout, retrying (${this.retryCount + 1}/${this.MAX_RETRIES})`);
      this.retryCount++;
      this.resetState();
      
      setTimeout(() => {
        const currentWord = this.stateManager.getState().currentWord;
        if (currentWord && !this.stateManager.getState().isPaused && !this.stateManager.getState().isMuted) {
          this.speak(currentWord, 'US');
        }
      }, 500);
      return;
    }

    this.resetState();
    this.retryCount = 0;
    this.autoAdvanceTimer.schedule(2000, this.stateManager.getState().isPaused, this.stateManager.getState().isMuted);
    resolve(false);
  }

  private handleSpeechError(resolve: (value: boolean) => void): void {
    this.resetState();
    this.retryCount = 0;
    this.autoAdvanceTimer.schedule(2000, this.stateManager.getState().isPaused, this.stateManager.getState().isMuted);
    resolve(false);
  }

  // Enhanced stop method with proper debouncing
  stop(): void {
    const now = Date.now();
    if (now - this.lastStopTime < this.MIN_STOP_INTERVAL) {
      console.log('[SPEECH-EXECUTOR] Stop call debounced to prevent loops');
      return;
    }
    this.lastStopTime = now;

    console.log('[SPEECH-EXECUTOR] Stopping speech');

    this.autoAdvanceTimer.clear();
    this.isStopping = true;
    this.cancelledUtterance = this.stateManager.getState().currentUtterance;
    this.retryCount = 0; // Reset retry count when manually stopping

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Clear utterance callbacks to prevent further events
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
