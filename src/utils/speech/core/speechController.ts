
import { getSpeechRate } from '@/utils/speech/core/speechSettings';

/**
 * Centralized Speech Controller - Single source of truth for all speech operations
 * Fixed version with improved state management and throttling
 */

interface SpeechState {
  isActive: boolean;
  currentUtterance: SpeechSynthesisUtterance | null;
  isPaused: boolean;
  lastOperationTime: number;
}

class SpeechController {
  private state: SpeechState = {
    isActive: false,
    currentUtterance: null,
    isPaused: false,
    lastOperationTime: 0
  };

  private readonly MIN_OPERATION_INTERVAL = 50; // Reduced from 100ms to be less restrictive
  private listeners: Set<(state: SpeechState) => void> = new Set();
  private stateCheckInterval: number | null = null;
  private forceResetTimeout: number | null = null;

  constructor() {
    // Start periodic state validation to prevent stuck states
    this.startStateValidation();
  }

  // Periodic validation to ensure state matches reality
  private startStateValidation() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
    }
    
    this.stateCheckInterval = window.setInterval(() => {
      this.validateAndSyncState();
    }, 500); // Check more frequently - every 500ms
  }

  private validateAndSyncState() {
    const actualSpeaking = window.speechSynthesis?.speaking || false;
    const actualPaused = window.speechSynthesis?.paused || false;
    
    // If we think we're active but speech synthesis isn't actually speaking
    if (this.state.isActive && !actualSpeaking && !actualPaused) {
      console.log('[CONTROLLER] State desync detected - resetting to inactive');
      this.state.isActive = false;
      this.state.currentUtterance = null;
      this.state.isPaused = false;
      this.notifyListeners();
    }
    
    // Update pause state to match reality
    if (this.state.isActive && this.state.isPaused !== actualPaused) {
      console.log(`[CONTROLLER] Pause state sync: ${actualPaused}`);
      this.state.isPaused = actualPaused;
      this.notifyListeners();
    }
  }

  // Subscribe to state changes
  subscribe(listener: (state: SpeechState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  private canPerformOperation(): boolean {
    const now = Date.now();
    if (now - this.state.lastOperationTime < this.MIN_OPERATION_INTERVAL) {
      console.log('[CONTROLLER] Operation throttled - too frequent, but allowing anyway for debugging');
      // Don't block, just log for debugging
    }
    this.state.lastOperationTime = now;
    return true; // Always allow operations to prevent blocking
  }

  // Get current state
  getState(): SpeechState {
    return { ...this.state };
  }

  // Check if speech is currently active - improved logic with better debugging
  isActive(): boolean {
    const browserSpeaking = window.speechSynthesis?.speaking || false;
    const browserPaused = window.speechSynthesis?.paused || false;
    
    console.log('[CONTROLLER] State check:', {
      internalActive: this.state.isActive,
      browserSpeaking,
      browserPaused,
      willReturn: this.state.isActive || browserSpeaking
    });
    
    // If browser says nothing is happening, we shouldn't be active
    if (!browserSpeaking && !browserPaused && this.state.isActive) {
      console.log('[CONTROLLER] Correcting stuck active state');
      this.state.isActive = false;
      this.state.currentUtterance = null;
      this.state.isPaused = false;
      this.notifyListeners();
      return false;
    }
    
    return this.state.isActive || browserSpeaking;
  }

  // Stop all speech immediately
  stop(): void {
    console.log('[CONTROLLER] Stopping all speech');
    
    // Cancel browser speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Clear utterance callbacks to prevent them from firing
    if (this.state.currentUtterance) {
      this.state.currentUtterance.onend = null;
      this.state.currentUtterance.onerror = null;
      this.state.currentUtterance.onstart = null;
    }

    // Reset state immediately
    this.state.isActive = false;
    this.state.currentUtterance = null;
    this.state.isPaused = false;

    this.notifyListeners();
  }

  // Force reset - more aggressive cleanup with timeout protection
  forceReset(): void {
    console.log('[CONTROLLER] Force resetting speech controller');
    
    // Clear any pending force reset
    if (this.forceResetTimeout) {
      clearTimeout(this.forceResetTimeout);
    }
    
    // Cancel everything
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Clear any utterance references
    if (this.state.currentUtterance) {
      this.state.currentUtterance.onend = null;
      this.state.currentUtterance.onerror = null;
      this.state.currentUtterance.onstart = null;
    }

    // Reset all state
    this.state.isActive = false;
    this.state.currentUtterance = null;
    this.state.isPaused = false;
    this.state.lastOperationTime = 0;

    this.notifyListeners();
    
    // Set a timeout to auto-reset if we get stuck again
    this.forceResetTimeout = window.setTimeout(() => {
      if (this.state.isActive && !window.speechSynthesis?.speaking) {
        console.log('[CONTROLLER] Auto-reset triggered due to stuck state');
        this.forceReset();
      }
    }, 5000);
  }

  // Pause current speech
  pause(): void {
    if (this.state.isActive && window.speechSynthesis?.speaking) {
      console.log('[CONTROLLER] Pausing speech');
      window.speechSynthesis.pause();
      this.state.isPaused = true;
      this.notifyListeners();
    }
  }

  // Resume paused speech
  resume(): void {
    if (this.state.isPaused && window.speechSynthesis?.paused) {
      console.log('[CONTROLLER] Resuming speech');
      window.speechSynthesis.resume();
      this.state.isPaused = false;
      this.notifyListeners();
    }
  }

  // Speak text with proper state management - improved version
  async speak(
    text: string,
    options: {
      voice?: SpeechSynthesisVoice | null;
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: SpeechSynthesisErrorEvent) => void;
    } = {}
  ): Promise<boolean> {
    console.log(`[CONTROLLER] Speak request: "${text.substring(0, 50)}..."`);
    console.log('[CONTROLLER] Current state before speak:', {
      isActive: this.state.isActive,
      browserSpeaking: window.speechSynthesis?.speaking,
      browserPaused: window.speechSynthesis?.paused
    });
    
    // Check if we're actually blocked or just think we are
    const actualSpeaking = window.speechSynthesis?.speaking || false;
    const actualPaused = window.speechSynthesis?.paused || false;
    
    if (this.state.isActive && (actualSpeaking || actualPaused)) {
      console.log('[CONTROLLER] Actually speaking/paused, rejecting new request');
      return false;
    }
    
    // If we think we're active but aren't actually speaking, reset state
    if (this.state.isActive && !actualSpeaking && !actualPaused) {
      console.log('[CONTROLLER] Correcting incorrect active state');
      this.forceReset();
    }

    if (!this.canPerformOperation()) {
      console.log('[CONTROLLER] Speech operation throttled but proceeding anyway');
    }

    // Stop any current speech first
    this.stop();

    // Wait for stop to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure utterance
        if (options.voice) utterance.voice = options.voice;
        utterance.rate = options.rate || getSpeechRate();
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        // Set up event handlers with proper cleanup
        utterance.onstart = () => {
          console.log('[CONTROLLER] Speech started successfully');
          this.state.isActive = true;
          this.state.isPaused = false;
          this.notifyListeners();
          options.onStart?.();
        };

        utterance.onend = () => {
          console.log('[CONTROLLER] Speech ended successfully');
          this.state.isActive = false;
          this.state.currentUtterance = null;
          this.state.isPaused = false;
          this.notifyListeners();
          options.onEnd?.();
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error('[CONTROLLER] Speech error:', event.error);
          this.state.isActive = false;
          this.state.currentUtterance = null;
          this.state.isPaused = false;
          this.notifyListeners();
          options.onError?.(event);
          resolve(false);
        };

        // Store current utterance
        this.state.currentUtterance = utterance;
        
        // Start speaking
        console.log('[CONTROLLER] About to call speechSynthesis.speak()');
        window.speechSynthesis.speak(utterance);
        console.log('[CONTROLLER] Speech initiated, state updated to active');

        // Enhanced fallback timeout with better detection
        setTimeout(() => {
          if (this.state.currentUtterance === utterance && !window.speechSynthesis.speaking && !this.state.isPaused) {
            console.warn('[CONTROLLER] Speech may have failed silently, cleaning up');
            this.state.isActive = false;
            this.state.currentUtterance = null;
            this.state.isPaused = false;
            this.notifyListeners();
            resolve(false);
          }
        }, 1000); // Longer timeout for detection

      } catch (error) {
        console.error('[CONTROLLER] Error setting up speech:', error);
        this.state.isActive = false;
        this.state.currentUtterance = null;
        resolve(false);
      }
    });
  }

  // Cleanup method
  destroy() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }
    if (this.forceResetTimeout) {
      clearTimeout(this.forceResetTimeout);
      this.forceResetTimeout = null;
    }
    this.stop();
    this.listeners.clear();
  }
}

// Export singleton instance
export const speechController = new SpeechController();
