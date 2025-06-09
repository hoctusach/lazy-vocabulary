
import { clearAllSpeechRequests } from '../core/speechEngine';
import { SpeechStateManager } from './speechStateManager';
import { SpeechExecutor } from './speechExecutor';
import { PauseResumeHandler } from './pauseResumeHandler';
import { SpeechOptions, PausedContent } from './types';

/**
 * Simplified speech controller with proper pause/resume functionality
 * Refactored into smaller, focused modules
 */
class SimpleSpeechController {
  private stateManager: SpeechStateManager;
  private executor: SpeechExecutor;
  private pauseHandler: PauseResumeHandler;

  constructor() {
    this.stateManager = new SpeechStateManager();
    this.executor = new SpeechExecutor(this.stateManager);
    this.pauseHandler = new PauseResumeHandler(this.stateManager);
  }

  async speak(text: string, options: SpeechOptions = {}): Promise<boolean> {
    return this.executor.execute(text, options);
  }

  stop(): void {
    console.log('[SIMPLE-CONTROLLER] Stop requested');
    
    this.executor.stop();
    clearAllSpeechRequests();
    this.stateManager.reset();
  }

  pause(): void {
    this.pauseHandler.pause();
  }

  resume(): void {
    this.pauseHandler.resume();
  }

  isPaused(): boolean {
    return this.stateManager.isPaused();
  }

  getPausedContent(): PausedContent {
    return this.stateManager.getPausedContent();
  }

  getState() {
    return this.stateManager.getState();
  }
}

export const simpleSpeechController = new SimpleSpeechController();
