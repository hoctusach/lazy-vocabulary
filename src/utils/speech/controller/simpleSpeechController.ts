
import { clearAllSpeechRequests, setGlobalPauseState } from '../core/speechEngine';
import { SpeechStateManager } from './speechStateManager';
import { SpeechExecutor } from './speechExecutor';
import { PauseResumeHandler } from './pauseResumeHandler';
import { SpeechOptions, PausedContent } from './types';

/**
 * Simplified speech controller with immediate pause response
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
    setGlobalPauseState(false); // Clear pause state when stopping
    this.stateManager.reset();
  }

  pause(): void {
    console.log('[SIMPLE-CONTROLLER] Pause requested - implementing immediate response');
    
    // Set global pause state immediately
    setGlobalPauseState(true);
    
    // Execute pause with immediate cancellation
    this.pauseHandler.pause();
  }

  resume(): void {
    console.log('[SIMPLE-CONTROLLER] Resume requested');
    
    // Clear global pause state first
    setGlobalPauseState(false);
    
    // Execute resume
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
