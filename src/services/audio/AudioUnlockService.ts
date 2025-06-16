
/**
 * Audio Unlock Service - Handles comprehensive audio initialization for mobile/desktop
 */
class AudioUnlockService {
  private isUnlocked = false;
  private unlockPromise: Promise<boolean> | null = null;
  private audioContext: AudioContext | null = null;
  private hasUserGesture = false;

  async unlock(): Promise<boolean> {
    // Return existing promise if unlock is in progress
    if (this.unlockPromise) {
      return this.unlockPromise;
    }

    // Return true if already unlocked
    if (this.isUnlocked) {
      return true;
    }

    console.log('[AUDIO-UNLOCK] Starting comprehensive audio unlock');

    this.unlockPromise = this.performUnlock();
    const result = await this.unlockPromise;
    this.unlockPromise = null;
    
    return result;
  }

  private async performUnlock(): Promise<boolean> {
    try {
      // Step 1: Initialize AudioContext
      await this.initializeAudioContext();
      
      // Step 2: Unlock speech synthesis with multiple attempts
      const speechUnlocked = await this.unlockSpeechSynthesis();
      
      // Step 3: Test actual speech playback
      const speechWorks = await this.testSpeechPlayback();
      
      this.isUnlocked = speechUnlocked && speechWorks;
      
      if (this.isUnlocked) {
        console.log('[AUDIO-UNLOCK] ✓ Audio successfully unlocked');
        localStorage.setItem('audioUnlocked', 'true');
      } else {
        console.warn('[AUDIO-UNLOCK] ⚠ Audio unlock incomplete');
      }
      
      return this.isUnlocked;
    } catch (error) {
      console.error('[AUDIO-UNLOCK] Error during unlock:', error);
      return false;
    }
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn('[AUDIO-UNLOCK] AudioContext not supported');
        return;
      }

      if (!this.audioContext) {
        this.audioContext = new AudioContext();
        console.log('[AUDIO-UNLOCK] AudioContext created, state:', this.audioContext.state);
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[AUDIO-UNLOCK] ✓ AudioContext resumed');
      }

      // Create a brief audio buffer to fully unlock
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
    } catch (error) {
      console.warn('[AUDIO-UNLOCK] AudioContext initialization failed:', error);
    }
  }

  private async unlockSpeechSynthesis(): Promise<boolean> {
    if (!window.speechSynthesis) {
      console.warn('[AUDIO-UNLOCK] Speech synthesis not supported');
      return false;
    }

    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 3;

      const tryUnlock = () => {
        attempts++;
        console.log(`[AUDIO-UNLOCK] Speech unlock attempt ${attempts}/${maxAttempts}`);

        // Cancel any existing speech
        window.speechSynthesis.cancel();

        // Create silent utterance
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0.01;
        utterance.rate = 10; // Fast to complete quickly

        const cleanup = () => {
          utterance.onend = null;
          utterance.onerror = null;
        };

        utterance.onend = () => {
          console.log('[AUDIO-UNLOCK] ✓ Speech synthesis unlocked');
          cleanup();
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.warn(`[AUDIO-UNLOCK] Speech unlock error attempt ${attempts}:`, event.error);
          cleanup();
          
          if (attempts < maxAttempts) {
            setTimeout(tryUnlock, 200);
          } else {
            resolve(false);
          }
        };

        try {
          window.speechSynthesis.speak(utterance);
          
          // Fallback timeout
          setTimeout(() => {
            if (utterance.onend) {
              cleanup();
              if (attempts < maxAttempts) {
                setTimeout(tryUnlock, 200);
              } else {
                resolve(false);
              }
            }
          }, 1000);
        } catch (error) {
          console.warn('[AUDIO-UNLOCK] Speech speak failed:', error);
          cleanup();
          if (attempts < maxAttempts) {
            setTimeout(tryUnlock, 200);
          } else {
            resolve(false);
          }
        }
      };

      tryUnlock();
    });
  }

  private async testSpeechPlayback(): Promise<boolean> {
    if (!window.speechSynthesis) return false;

    return new Promise((resolve) => {
      console.log('[AUDIO-UNLOCK] Testing speech playback');
      
      const utterance = new SpeechSynthesisUtterance('test');
      utterance.volume = 0.01;
      utterance.rate = 10;

      const cleanup = () => {
        utterance.onend = null;
        utterance.onerror = null;
      };

      utterance.onend = () => {
        console.log('[AUDIO-UNLOCK] ✓ Speech test successful');
        cleanup();
        resolve(true);
      };

      utterance.onerror = (event) => {
        console.warn('[AUDIO-UNLOCK] Speech test failed:', event.error);
        cleanup();
        resolve(false);
      };

      try {
        window.speechSynthesis.speak(utterance);
        
        // Timeout fallback
        setTimeout(() => {
          if (utterance.onend) {
            cleanup();
            resolve(false);
          }
        }, 2000);
      } catch (error) {
        cleanup();
        resolve(false);
      }
    });
  }

  markUserGesture(): void {
    if (!this.hasUserGesture) {
      console.log('[AUDIO-UNLOCK] User gesture detected');
      this.hasUserGesture = true;
      localStorage.setItem('hasUserGesture', 'true');
    }
  }

  isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  hasValidUserGesture(): boolean {
    return this.hasUserGesture || localStorage.getItem('hasUserGesture') === 'true';
  }

  reset(): void {
    this.isUnlocked = false;
    this.unlockPromise = null;
    this.hasUserGesture = false;
    localStorage.removeItem('audioUnlocked');
    localStorage.removeItem('hasUserGesture');
  }
}

export const audioUnlockService = new AudioUnlockService();
