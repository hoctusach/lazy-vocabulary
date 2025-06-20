
import { VocabularyWord } from '@/types/vocabulary';
import { SpeechOptions } from './SpeechOptions';
import { SpeechStateManager } from './SpeechStateManager';
import { AutoAdvanceTimer } from './AutoAdvanceTimer';
import { VoiceManager } from './VoiceManager';
import { SpeechExecutionCore } from './SpeechExecutionCore';

/**
 * Enhanced Speech Executor - Simplified facade over SpeechExecutionCore
 * Refactored into smaller, focused modules while maintaining exact functionality
 */
export class SpeechExecutor {
  private core: SpeechExecutionCore;

  constructor(
    private stateManager: SpeechStateManager,
    private autoAdvanceTimer: AutoAdvanceTimer,
    private voiceManager: VoiceManager
  ) {
    this.core = new SpeechExecutionCore(stateManager, autoAdvanceTimer, voiceManager);
  }

  async speak(word: VocabularyWord, voiceRegion: 'US' | 'UK' | 'AU' = 'US', options?: SpeechOptions): Promise<boolean> {
    return this.core.speak(word, voiceRegion, options);
  }

  stop(): void {
    this.core.stop();
  }

  pause(): void {
    this.core.pause();
  }

  resume(): void {
    this.core.resume();
  }

  setMuted(muted: boolean): void {
    this.core.setMuted(muted);
  }

  destroy(): void {
    this.core.destroy();
  }
}
