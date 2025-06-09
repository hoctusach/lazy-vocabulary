
import { mobileGestureDetector } from './mobileGestureDetector';

/**
 * Mobile-optimized speech controller with interruption recovery
 */
class MobileSpeechController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;
  private retryCount = 0;
  private maxRetries = 3;
  private speechQueue: Array<{ text: string; options: any }> = [];
  private isProcessingQueue = false;

  async speak(
    text: string,
    options: {
      voice?: SpeechSynthesisVoice | null;
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: any) => void;
    } = {}
  ): Promise<boolean> {
    console.log('[MOBILE-SPEECH] speak() called');

    // Wait for user gesture on mobile
    if (!mobileGestureDetector.hasGesture()) {
      console.log('[MOBILE-SPEECH] Waiting for user gesture...');
      return new Promise((resolve) => {
        mobileGestureDetector.onGestureReady(() => {
          console.log('[MOBILE-SPEECH] Gesture ready, proceeding with speech');
          this.speakInternal(text, options).then(resolve);
        });
      });
    }

    return this.speakInternal(text, options);
  }

  private async speakInternal(
    text: string,
    options: {
      voice?: SpeechSynthesisVoice | null;
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: any) => void;
    }
  ): Promise<boolean> {
    // Stop any existing speech
    this.stop();

    return new Promise((resolve) => {
      try {
        if (!window.speechSynthesis) {
          console.error('[MOBILE-SPEECH] Speech synthesis not supported');
          options.onError?.('Speech synthesis not supported');
          resolve(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;
        this.isActive = true;
        this.retryCount = 0;

        // Apply voice settings with mobile-optimized defaults
        if (options.voice) {
          utterance.voice = options.voice;
        }
        utterance.rate = options.rate || 0.8; // Slightly slower for mobile
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        let hasStarted = false;
        let hasEnded = false;

        utterance.onstart = () => {
          if (hasStarted) return;
          hasStarted = true;
          console.log('[MOBILE-SPEECH] ✓ Speech started successfully');
          options.onStart?.();
          resolve(true);
        };

        utterance.onend = () => {
          if (hasEnded) return;
          hasEnded = true;
          console.log('[MOBILE-SPEECH] ✓ Speech ended normally');
          this.cleanup();
          options.onEnd?.();
        };

        utterance.onerror = (event) => {
          console.error('[MOBILE-SPEECH] ✗ Speech error:', event.error);
          this.cleanup();
          
          // Handle specific mobile errors
          if (event.error === 'interrupted' || event.error === 'canceled') {
            this.handleInterruption(text, options, resolve);
          } else {
            options.onError?.(event);
            resolve(false);
          }
        };

        // Mobile-specific: Add speech monitoring to detect interruptions
        this.startSpeechMonitoring(text, options, resolve);

        console.log('[MOBILE-SPEECH] Starting speech synthesis...');
        window.speechSynthesis.speak(utterance);

        // Fallback timeout for mobile
        setTimeout(() => {
          if (this.isActive && this.currentUtterance === utterance && !hasStarted) {
            console.log('[MOBILE-SPEECH] Fallback - assuming speech started');
            hasStarted = true;
            resolve(true);
          }
        }, 1000);

      } catch (error) {
        console.error('[MOBILE-SPEECH] Exception in speak():', error);
        this.cleanup();
        options.onError?.(error);
        resolve(false);
      }
    });
  }

  private startSpeechMonitoring(
    text: string,
    options: any,
    resolve: (value: boolean) => void
  ) {
    // Monitor speech state every 100ms to detect interruptions
    const monitorInterval = setInterval(() => {
      if (!this.isActive || !this.currentUtterance) {
        clearInterval(monitorInterval);
        return;
      }

      // Check if speech was interrupted
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        console.log('[MOBILE-SPEECH] Speech interruption detected');
        clearInterval(monitorInterval);
        this.handleInterruption(text, options, resolve);
      }
    }, 100);

    // Clean up monitor after reasonable time
    setTimeout(() => {
      clearInterval(monitorInterval);
    }, 30000);
  }

  private handleInterruption(
    text: string,
    options: any,
    resolve: (value: boolean) => void
  ) {
    if (this.retryCount >= this.maxRetries) {
      console.log('[MOBILE-SPEECH] Max retries reached, giving up');
      options.onError?.('Max retries reached');
      resolve(false);
      return;
    }

    this.retryCount++;
    console.log(`[MOBILE-SPEECH] Retrying speech (attempt ${this.retryCount}/${this.maxRetries})`);

    // Wait before retry, increasing delay each time
    const retryDelay = 500 * this.retryCount;
    setTimeout(() => {
      this.speakInternal(text, options).then(resolve);
    }, retryDelay);
  }

  stop(): void {
    console.log('[MOBILE-SPEECH] stop() called');
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    this.cleanup();
  }

  private cleanup(): void {
    this.currentUtterance = null;
    this.isActive = false;
    this.retryCount = 0;
  }

  isCurrentlyActive(): boolean {
    return this.isActive;
  }

  // Force gesture detection for immediate speech capability
  enableImmediateSpeech(): void {
    mobileGestureDetector.forceGestureDetection();
  }
}

export const mobileSpeechController = new MobileSpeechController();
