
/**
 * Mobile Audio Manager - Handles audio context lifecycle for mobile devices
 */
class MobileAudioManager {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private resumePromise: Promise<void> | null = null;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn('[MOBILE-AUDIO] AudioContext not supported');
        return false;
      }

      this.audioContext = new AudioContext();
      console.log('[MOBILE-AUDIO] AudioContext created, state:', this.audioContext.state);

      if (this.audioContext.state === 'suspended') {
        await this.resume();
      }

      this.isInitialized = true;
      this.setupEventListeners();
      return true;

    } catch (error) {
      console.error('[MOBILE-AUDIO] Failed to initialize AudioContext:', error);
      return false;
    }
  }

  async resume(): Promise<void> {
    if (!this.audioContext) return;

    // Prevent multiple simultaneous resume attempts
    if (this.resumePromise) {
      return this.resumePromise;
    }

    if (this.audioContext.state === 'suspended') {
      console.log('[MOBILE-AUDIO] Resuming suspended AudioContext');
      
      this.resumePromise = this.audioContext.resume().then(() => {
        console.log('[MOBILE-AUDIO] ✓ AudioContext resumed successfully');
        this.resumePromise = null;
      }).catch((error) => {
        console.error('[MOBILE-AUDIO] Failed to resume AudioContext:', error);
        this.resumePromise = null;
      });

      return this.resumePromise;
    }
  }

  private setupEventListeners(): void {
    // Resume audio context when page becomes visible
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        await this.resume();
      }
    });

    // Resume audio context on page show (back navigation)
    window.addEventListener('pageshow', async () => {
      await this.resume();
    });

    // Resume on user interaction events
    const interactionEvents = ['click', 'touchstart', 'keydown'];
    const handleInteraction = async () => {
      await this.resume();
      
      // Remove listeners after first interaction
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true, passive: true });
    });
  }

  getState(): string {
    return this.audioContext?.state || 'unknown';
  }

  isReady(): boolean {
    return this.isInitialized && this.audioContext?.state === 'running';
  }

  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
    this.resumePromise = null;
  }
}

export const mobileAudioManager = new MobileAudioManager();
