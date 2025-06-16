
/**
 * Enhanced Audio Unlock Service with improved user gesture detection
 */
class AudioUnlockService {
  private isAudioUnlocked = false;
  private hasUserGesture = false;
  private unlockAttempts = 0;
  private readonly MAX_UNLOCK_ATTEMPTS = 3;
  private silentTestUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.setupUserGestureDetection();
  }

  private setupUserGestureDetection(): void {
    const handleUserGesture = () => {
      console.log('[AUDIO-UNLOCK] ✓ User gesture detected');
      this.hasUserGesture = true;
      localStorage.setItem('hasUserGesture', 'true');
      
      // Try to unlock immediately on first gesture
      if (!this.isAudioUnlocked) {
        this.unlock();
      }
    };

    // Check if we previously had user gesture
    if (localStorage.getItem('hasUserGesture') === 'true') {
      console.log('[AUDIO-UNLOCK] Previous user gesture found in storage');
      this.hasUserGesture = true;
    }

    // Listen for user interactions
    ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(event => {
      document.addEventListener(event, handleUserGesture, { once: false, passive: true });
    });
  }

  hasValidUserGesture(): boolean {
    return this.hasUserGesture;
  }

  isUnlocked(): boolean {
    return this.isAudioUnlocked && this.hasUserGesture;
  }

  async unlock(): Promise<boolean> {
    console.log('[AUDIO-UNLOCK] Starting unlock process', {
      hasUserGesture: this.hasUserGesture,
      isUnlocked: this.isAudioUnlocked,
      attempts: this.unlockAttempts
    });

    if (!this.hasUserGesture) {
      console.log('[AUDIO-UNLOCK] ✗ No user gesture detected yet');
      return false;
    }

    if (this.isAudioUnlocked) {
      console.log('[AUDIO-UNLOCK] ✓ Already unlocked');
      return true;
    }

    if (this.unlockAttempts >= this.MAX_UNLOCK_ATTEMPTS) {
      console.log('[AUDIO-UNLOCK] ✗ Max unlock attempts reached');
      return false;
    }

    this.unlockAttempts++;

    try {
      // Test with Web Audio API
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx();
        
        if (audioContext.state === 'suspended') {
          console.log('[AUDIO-UNLOCK] Resuming suspended audio context');
          await audioContext.resume();
        }
        
        if (audioContext.state === 'running') {
          console.log('[AUDIO-UNLOCK] ✓ Audio context is running');
        }
        
        audioContext.close();
      }

      // Test with speech synthesis
      if (window.speechSynthesis) {
        // Cancel any existing speech first
        window.speechSynthesis.cancel();
        
        // Wait a bit for cancellation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create a silent test utterance
        this.silentTestUtterance = new SpeechSynthesisUtterance(' ');
        this.silentTestUtterance.volume = 0.01; // Nearly silent
        this.silentTestUtterance.rate = 10; // Very fast
        this.silentTestUtterance.pitch = 0.1; // Very low
        
        const unlockPromise = new Promise<boolean>((resolve) => {
          let resolved = false;
          
          const resolveOnce = (success: boolean) => {
            if (!resolved) {
              resolved = true;
              resolve(success);
            }
          };

          if (this.silentTestUtterance) {
            this.silentTestUtterance.onstart = () => {
              console.log('[AUDIO-UNLOCK] ✓ Silent utterance started - audio unlocked');
              this.isAudioUnlocked = true;
              localStorage.setItem('audioUnlocked', 'true');
              resolveOnce(true);
            };

            this.silentTestUtterance.onend = () => {
              console.log('[AUDIO-UNLOCK] Silent utterance ended');
              if (!this.isAudioUnlocked) {
                resolveOnce(false);
              }
            };

            this.silentTestUtterance.onerror = (event) => {
              console.log('[AUDIO-UNLOCK] ✗ Silent utterance error:', event.error);
              resolveOnce(false);
            };

            console.log('[AUDIO-UNLOCK] Speaking silent test utterance');
            window.speechSynthesis.speak(this.silentTestUtterance);
          }

          // Fallback timeout
          setTimeout(() => {
            if (!resolved) {
              console.log('[AUDIO-UNLOCK] Timeout - assuming unlocked');
              this.isAudioUnlocked = true;
              localStorage.setItem('audioUnlocked', 'true');
              resolveOnce(true);
            }
          }, 1000);
        });

        const result = await unlockPromise;
        
        if (result) {
          console.log('[AUDIO-UNLOCK] ✓ Audio successfully unlocked');
          return true;
        }
      }

      console.log('[AUDIO-UNLOCK] ✗ Failed to unlock audio');
      return false;

    } catch (error) {
      console.error('[AUDIO-UNLOCK] ✗ Error during unlock:', error);
      return false;
    }
  }

  reset(): void {
    console.log('[AUDIO-UNLOCK] Resetting unlock state');
    this.isAudioUnlocked = false;
    this.hasUserGesture = false;
    this.unlockAttempts = 0;
    localStorage.removeItem('hasUserGesture');
    localStorage.removeItem('audioUnlocked');
    
    if (this.silentTestUtterance && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioUnlockService = new AudioUnlockService();
