
import { VocabularyWord } from '@/types/vocabulary';
import { SpeechState, StateChangeListener } from './SpeechState';

/**
 * Manages speech state and notifies listeners of changes
 */
export class SpeechStateManager {
  private state: SpeechState = {
    isActive: false,
    isPaused: false,
    isMuted: false,
    currentWord: null,
    currentUtterance: null
  };

  private listeners: Set<StateChangeListener> = new Set();

  // Subscribe to state changes
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get current state
  getState(): SpeechState {
    return { ...this.state };
  }

  // Update state and notify listeners
  updateState(updates: Partial<SpeechState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  // Set specific state properties
  setActive(isActive: boolean): void {
    this.updateState({ isActive });
  }

  setPaused(isPaused: boolean): void {
    this.updateState({ isPaused });
  }

  setMuted(isMuted: boolean): void {
    this.updateState({ isMuted });
  }

  setCurrentWord(currentWord: VocabularyWord | null): void {
    this.updateState({ currentWord });
  }

  setCurrentUtterance(currentUtterance: SpeechSynthesisUtterance | null): void {
    this.updateState({ currentUtterance });
  }

  // Check if currently active
  isCurrentlyActive(): boolean {
    return this.state.isActive;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  // Clear all listeners
  destroy(): void {
    this.listeners.clear();
  }
}
