
import { VocabularyWord } from '@/types/vocabulary';

interface SpeechState {
  isActive: boolean;
  isPaused: boolean;
  isMuted: boolean;
  currentWord: VocabularyWord | null;
  currentUtterance: SpeechSynthesisUtterance | null;
}

type StateChangeListener = (state: SpeechState) => void;

/**
 * Unified Speech Controller - Single source of truth for all speech operations
 * Fixed version with improved auto-advance timer management
 */
class UnifiedSpeechController {
  private state: SpeechState = {
    isActive: false,
    isPaused: false,
    isMuted: false,
    currentWord: null,
    currentUtterance: null
  };

  private listeners: Set<StateChangeListener> = new Set();
  private autoAdvanceTimer: number | null = null;
  private onWordComplete: (() => void) | null = null;
  private isStopping = false;
  private cancelledUtterance: SpeechSynthesisUtterance | null = null;

  // Subscribe to state changes
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get current state
  getState(): SpeechState {
    return { ...this.state };
  }

  // Set word completion callback
  setWordCompleteCallback(callback: (() => void) | null): void {
    this.onWordComplete = callback;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  // Clear any pending auto-advance - CRITICAL for preventing fast playback
  private clearAutoAdvance(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
      console.log('[UNIFIED-SPEECH] Auto-advance timer cleared');
    }
  }

  // Schedule auto-advance with proper debouncing
  private scheduleAutoAdvance(delay: number = 1500): void {
    // ALWAYS clear existing timer first to prevent multiple timers
    this.clearAutoAdvance();
    
    if (this.state.isPaused || this.state.isMuted) {
      console.log('[UNIFIED-SPEECH] Skipping auto-advance - paused or muted');
      return;
    }

    console.log(`[UNIFIED-SPEECH] Scheduling auto-advance in ${delay}ms`);
    this.autoAdvanceTimer = window.setTimeout(() => {
      this.autoAdvanceTimer = null;
      if (this.onWordComplete && !this.state.isPaused && !this.state.isMuted) {
        console.log('[UNIFIED-SPEECH] Auto-advancing to next word');
        this.onWordComplete();
      }
    }, delay);
  }

  // Create formatted speech text
  private createSpeechText(word: VocabularyWord): string {
    const cleanText = (text: string) => text.trim().replace(/\s+/g, ' ');
    
    const wordText = cleanText(word.word);
    const meaningText = cleanText(word.meaning);
    const exampleText = cleanText(word.example);
    
    return `${wordText}. ${meaningText}. ${exampleText}`;
  }

  // Find voice by region
  private findVoice(region: 'US' | 'UK' | 'AU'): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis?.getVoices() || [];
    
    const regionMap = {
      'US': ['en-US', 'en_US'],
      'UK': ['en-GB', 'en_GB'], 
      'AU': ['en-AU', 'en_AU']
    };

    const langCodes = regionMap[region];
    return voices.find(voice => 
      langCodes.some(code => voice.lang.includes(code))
    ) || voices.find(voice => voice.lang.startsWith('en')) || null;
  }

  // Main speak method with fixed timer management
  async speak(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    console.log(`[UNIFIED-SPEECH] Speaking word: ${word.word}`);

    // CRITICAL: Clear any existing auto-advance timer before starting new speech
    this.clearAutoAdvance();

    // Check if we can speak
    if (this.state.isMuted) {
      console.log('[UNIFIED-SPEECH] Skipping - muted, scheduling auto-advance');
      this.scheduleAutoAdvance(3000);
      return false;
    }

    if (this.state.isPaused) {
      console.log('[UNIFIED-SPEECH] Skipping - paused');
      return false;
    }

    if (this.state.isActive || this.state.currentUtterance) {
      console.log('[UNIFIED-SPEECH] Cancelling existing utterance before speaking');
      this.stop();
      // Wait briefly for cancellation to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check browser support
    if (!window.speechSynthesis) {
      console.error('[UNIFIED-SPEECH] Speech synthesis not supported');
      this.scheduleAutoAdvance(2000);
      return false;
    }

    return new Promise((resolve) => {
      try {
        const speechText = this.createSpeechText(word);
        const utterance = new SpeechSynthesisUtterance(speechText);
        
        // Configure utterance
        const voice = this.findVoice(voiceRegion);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Set up event handlers
        utterance.onstart = () => {
          console.log(`[UNIFIED-SPEECH] ✓ Speech started for: ${word.word}`);
          this.state.isActive = true;
          this.state.currentWord = word;
          this.state.currentUtterance = utterance;
          this.notifyListeners();
        };

        utterance.onend = () => {
          console.log(`[UNIFIED-SPEECH] ✓ Speech completed for: ${word.word}`);
          this.state.isActive = false;
          this.state.currentWord = null;
          this.state.currentUtterance = null;
          this.isStopping = false;
          this.cancelledUtterance = null;
          this.notifyListeners();
          
          // Schedule auto-advance after speech completes
          this.scheduleAutoAdvance();
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error(`[UNIFIED-SPEECH] \u2717 Speech error:`, event.error);
          this.state.isActive = false;
          this.state.currentWord = null;
          this.state.currentUtterance = null;
          this.notifyListeners();

          // ensure timers don't continue running
          this.clearAutoAdvance();

          const wasManual =
            (this.isStopping || this.cancelledUtterance === utterance) &&
            event.error === 'canceled';

          if (wasManual) {
            console.log('[UNIFIED-SPEECH] Speech was canceled manually');
            this.isStopping = false;
            this.cancelledUtterance = null;
            return resolve(false);
          }

          if (event.error === 'canceled') {
            console.log('[UNIFIED-SPEECH] Speech was canceled unexpectedly, advancing');
            this.scheduleAutoAdvance(1500);
            this.isStopping = false;
            this.cancelledUtterance = null;
            return resolve(false);
          }

          try {
            window.speechSynthesis.cancel();
          } catch (e) {
            console.warn('[UNIFIED-SPEECH] Failed to reset speech synthesis', e);
          }

          this.scheduleAutoAdvance(2000);
          this.isStopping = false;
          this.cancelledUtterance = null;
          resolve(false);
        };

        // Store current utterance and start speaking
        this.state.currentUtterance = utterance;
        this.isStopping = false;
        this.cancelledUtterance = null;
        window.speechSynthesis.speak(utterance);

        // Fallback timeout
        setTimeout(() => {
          if (this.state.currentUtterance === utterance && !this.state.isActive) {
            console.warn('[UNIFIED-SPEECH] Speech may have failed silently');
            resolve(false);
          }
        }, 1000);

      } catch (error) {
        console.error('[UNIFIED-SPEECH] Error in speak method:', error);
        this.state.isActive = false;
        this.state.currentWord = null;
        this.state.currentUtterance = null;
        this.notifyListeners();
        this.scheduleAutoAdvance(2000);
        resolve(false);
      }
    });
  }

  // Stop speech with proper cleanup
  stop(): void {
    console.log('[UNIFIED-SPEECH] Stopping speech');

    // CRITICAL: Clear auto-advance timer when stopping
    this.clearAutoAdvance();

    this.isStopping = true;
    this.cancelledUtterance = this.state.currentUtterance;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Clear utterance callbacks
    if (this.state.currentUtterance) {
      this.state.currentUtterance.onend = null;
      this.state.currentUtterance.onerror = null;
      this.state.currentUtterance.onstart = null;
    }

    this.state.isActive = false;
    this.state.currentWord = null;
    this.state.currentUtterance = null;
    this.notifyListeners();

  }

  // Pause speech
  pause(): void {
    console.log('[UNIFIED-SPEECH] Pausing speech');
    this.clearAutoAdvance(); // Clear timer when pausing
    
    if (this.state.isActive && window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
    }
    
    this.state.isPaused = true;
    this.notifyListeners();
  }

  // Resume speech
  resume(): void {
    console.log('[UNIFIED-SPEECH] Resuming speech');
    
    this.state.isPaused = false;
    this.notifyListeners();
    
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }

  // Toggle mute
  setMuted(muted: boolean): void {
    console.log(`[UNIFIED-SPEECH] Setting muted: ${muted}`);
    
    if (muted && this.state.isActive) {
      this.stop();
    } else if (muted) {
      this.clearAutoAdvance(); // Clear timer when muting
    }
    
    this.state.isMuted = muted;
    this.notifyListeners();
  }

  // Check if currently active
  isCurrentlyActive(): boolean {
    return this.state.isActive;
  }

  // Cleanup method
  destroy(): void {
    this.clearAutoAdvance();
    this.stop();
    this.listeners.clear();
  }
}

// Export singleton instance
export const unifiedSpeechController = new UnifiedSpeechController();
