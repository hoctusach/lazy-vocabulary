
import { SpeechState, SpeechOptions } from './types';

/**
 * Manages the internal state of the speech controller
 */
export class SpeechStateManager {
  private state: SpeechState = {
    currentUtterance: null,
    currentSpeechId: null,
    isActive: false,
    speechStarted: false,
    speechEnded: false,
    isPausedByUser: false,
    pausedText: null,
    pausedOptions: null
  };

  getState(): SpeechState {
    return { ...this.state };
  }

  setCurrentSpeech(utterance: SpeechSynthesisUtterance | null, speechId: string | null): void {
    this.state.currentUtterance = utterance;
    this.state.currentSpeechId = speechId;
  }

  setActive(active: boolean): void {
    this.state.isActive = active;
  }

  setSpeechProgress(started: boolean, ended: boolean): void {
    this.state.speechStarted = started;
    this.state.speechEnded = ended;
  }

  setPauseState(isPaused: boolean, text?: string | null, options?: SpeechOptions | null): void {
    this.state.isPausedByUser = isPaused;
    if (text !== undefined) this.state.pausedText = text;
    if (options !== undefined) this.state.pausedOptions = options;
  }

  storePausedContent(text: string, options: SpeechOptions): void {
    this.state.pausedText = text;
    this.state.pausedOptions = options;
  }

  getPausedContent(): { text: string | null; options: SpeechOptions | null } {
    return {
      text: this.state.pausedText,
      options: this.state.pausedOptions
    };
  }

  reset(): void {
    this.state = {
      currentUtterance: null,
      currentSpeechId: null,
      isActive: false,
      speechStarted: false,
      speechEnded: false,
      isPausedByUser: false,
      pausedText: null,
      pausedOptions: null
    };
  }

  isPaused(): boolean {
    return this.state.isPausedByUser;
  }

  getCurrentSpeechId(): string | null {
    return this.state.currentSpeechId;
  }

  isCurrentlyActive(): boolean {
    return this.state.isActive;
  }
}
