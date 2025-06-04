
/**
 * Centralized Speech Controller - Single source of truth for all speech operations
 * This eliminates race conditions and overlapping speech attempts
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

  private readonly MIN_OPERATION_INTERVAL = 300; // Prevent rapid operations
  private listeners: Set<(state: SpeechState) => void> = new Set();

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
      console.log('[CONTROLLER] Operation throttled to prevent race conditions');
      return false;
    }
    this.state.lastOperationTime = now;
    return true;
  }

  // Get current state
  getState(): SpeechState {
    return { ...this.state };
  }

  // Check if speech is currently active
  isActive(): boolean {
    return this.state.isActive || window.speechSynthesis?.speaking || false;
  }

  // Stop all speech immediately
  stop(): void {
    if (!this.canPerformOperation()) return;

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

    // Reset state
    this.state.isActive = false;
    this.state.currentUtterance = null;
    this.state.isPaused = false;

    this.notifyListeners();
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

  // Speak text with proper state management
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
    if (!this.canPerformOperation()) {
      console.log('[CONTROLLER] Speech operation throttled');
      return false;
    }

    // Stop any current speech first
    this.stop();

    // Wait for stop to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure utterance
        if (options.voice) utterance.voice = options.voice;
        utterance.rate = options.rate || 0.8;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        // Set up event handlers
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
        window.speechSynthesis.speak(utterance);
        
        console.log('[CONTROLLER] Speech initiated');

      } catch (error) {
        console.error('[CONTROLLER] Error setting up speech:', error);
        this.state.isActive = false;
        this.state.currentUtterance = null;
        resolve(false);
      }
    });
  }
}

// Export singleton instance
export const speechController = new SpeechController();
