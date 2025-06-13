
import { VocabularyWord } from '@/types/vocabulary';
import { SpeechState, StateChangeListener } from './core/SpeechState';
import { SpeechStateManager } from './core/SpeechStateManager';
import { AutoAdvanceTimer } from './core/AutoAdvanceTimer';
import { VoiceManager } from './core/VoiceManager';
import { SpeechExecutor } from './core/SpeechExecutor';
import { SpeechGuard } from './core/SpeechGuard';

/**
 * Unified Speech Controller - Single source of truth for all speech operations
 * Refactored version using modular architecture
 */
class UnifiedSpeechController {
  private stateManager: SpeechStateManager;
  private autoAdvanceTimer: AutoAdvanceTimer;
  private voiceManager: VoiceManager;
  private speechExecutor: SpeechExecutor;
  private guard: SpeechGuard;

  constructor() {
    this.stateManager = new SpeechStateManager();
    this.autoAdvanceTimer = new AutoAdvanceTimer();
    this.voiceManager = new VoiceManager();
    this.speechExecutor = new SpeechExecutor(
      this.stateManager,
      this.autoAdvanceTimer,
      this.voiceManager
    );
    this.guard = new SpeechGuard(this.stateManager);
  }

  // Legacy compatibility helpers
  isPaused(): boolean {
    return this.stateManager.getState().isPaused;
  }

  // Subscribe to state changes
  subscribe(listener: StateChangeListener): () => void {
    return this.stateManager.subscribe(listener);
  }

  // Get current state
  getState(): SpeechState {
    return this.stateManager.getState();
  }

  // Set word completion callback
  setWordCompleteCallback(callback: (() => void) | null): void {
    this.autoAdvanceTimer.setWordCompleteCallback(callback);
  }

  // Main speak method
  async speak(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    console.log(`[UNIFIED-SPEECH] speak() called for: ${word.word}`);
    return this.speechExecutor.speak(word, voiceRegion);
  }

  canSpeak() {
    return this.guard.canPlay();
  }

  // Stop speech
  stop(): void {
    this.speechExecutor.stop();
  }

  // Pause speech
  pause(): void {
    this.speechExecutor.pause();
  }

  // Resume speech
  resume(): void {
    this.speechExecutor.resume();
  }

  // Toggle mute
  setMuted(muted: boolean): void {
    this.speechExecutor.setMuted(muted);
  }

  // Check if currently active
  isCurrentlyActive(): boolean {
    return this.stateManager.isCurrentlyActive();
  }

  // Cleanup method
  destroy(): void {
    this.autoAdvanceTimer.destroy();
    this.speechExecutor.destroy();
    this.stateManager.destroy();
  }
}

// Export singleton instance
export const unifiedSpeechController = new UnifiedSpeechController();
