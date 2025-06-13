import { SpeechStateManager } from './SpeechStateManager';

export interface SpeechGuardResult {
  canPlay: boolean;
  reason?: string;
}

/**
 * Centralized guard for validating speech playback state.
 * Only checks playback state (mute, pause, active).
 */
export class SpeechGuard {
  constructor(private stateManager: SpeechStateManager) {}

  canPlay(): SpeechGuardResult {
    const state = this.stateManager.getState();
    if (state.isMuted) {
      return { canPlay: false, reason: 'muted' };
    }
    if (state.isPaused) {
      return { canPlay: false, reason: 'paused' };
    }
    if (state.isActive || state.currentUtterance) {
      return { canPlay: false, reason: 'busy' };
    }
    return { canPlay: true };
  }
}
