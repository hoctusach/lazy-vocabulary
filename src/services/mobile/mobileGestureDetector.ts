
/**
 * Mobile gesture detection service for enabling speech on mobile devices
 * Detects various user interactions to unlock audio capabilities
 */
class MobileGestureDetector {
  private gestureDetected = false;
  private callbacks: Array<() => void> = [];
  private touchStartTime = 0;
  private touchStartY = 0;
  private isListening = false;

  constructor() {
    this.initializeDetection();
  }

  private initializeDetection() {
    // Check if we already have gesture permission from previous session
    const storedPermission = localStorage.getItem('mobileGestureDetected');
    if (storedPermission === 'true') {
      this.gestureDetected = true;
      console.log('[MOBILE-GESTURE] Previous gesture permission found');
      return;
    }

    this.startListening();
  }

  private startListening() {
    if (this.isListening || this.gestureDetected) return;
    
    this.isListening = true;
    console.log('[MOBILE-GESTURE] Starting mobile gesture detection');

    // Multiple gesture types for maximum compatibility
    const gestures = [
      'touchstart',
      'touchend', 
      'touchmove',
      'click',
      'scroll',
      'keydown',
      'pointerdown',
      'mousedown'
    ];

    const handleGesture = (event: Event) => {
      if (this.gestureDetected) return;

      // Special handling for touch events to detect meaningful interactions
      if (event.type === 'touchstart') {
        const touch = (event as TouchEvent).touches[0];
        this.touchStartTime = Date.now();
        this.touchStartY = touch.clientY;
        return;
      }

      if (event.type === 'touchend') {
        const touchDuration = Date.now() - this.touchStartTime;
        const touch = (event as TouchEvent).changedTouches[0];
        const touchDistance = Math.abs(touch.clientY - this.touchStartY);
        
        // Only count as gesture if touch was meaningful (duration > 50ms or movement > 10px)
        if (touchDuration < 50 && touchDistance < 10) {
          return;
        }
      }

      console.log(`[MOBILE-GESTURE] User gesture detected: ${event.type}`);
      this.onGestureDetected();
      
      // Remove all listeners after first gesture
      gestures.forEach(type => {
        document.removeEventListener(type, handleGesture, { passive: true } as any);
      });
    };

    // Add all gesture listeners
    gestures.forEach(type => {
      document.addEventListener(type, handleGesture, { passive: true });
    });

    // Auto-trigger after a delay if no gesture detected (fallback for some mobile browsers)
    setTimeout(() => {
      if (!this.gestureDetected) {
        console.log('[MOBILE-GESTURE] Auto-triggering gesture after timeout');
        this.onGestureDetected();
      }
    }, 3000);
  }

  private onGestureDetected() {
    if (this.gestureDetected) return;
    
    this.gestureDetected = true;
    this.isListening = false;
    localStorage.setItem('mobileGestureDetected', 'true');
    
    console.log('[MOBILE-GESTURE] ✓ Mobile gesture confirmed, enabling audio');
    
    // Initialize audio context immediately
    this.initializeAudioContext();
    
    // Notify all callbacks
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[MOBILE-GESTURE] Error in gesture callback:', error);
      }
    });
    
    this.callbacks = []; // Clear callbacks after execution
  }

  private initializeAudioContext() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('[MOBILE-GESTURE] ✓ Audio context resumed');
          });
        }
      }
    } catch (error) {
      console.warn('[MOBILE-GESTURE] Audio context initialization failed:', error);
    }
  }

  public onGestureReady(callback: () => void) {
    if (this.gestureDetected) {
      // Execute immediately if gesture already detected
      callback();
    } else {
      // Queue for later execution
      this.callbacks.push(callback);
    }
  }

  public hasGesture(): boolean {
    return this.gestureDetected;
  }

  public forceGestureDetection() {
    console.log('[MOBILE-GESTURE] Forcing gesture detection');
    this.onGestureDetected();
  }
}

export const mobileGestureDetector = new MobileGestureDetector();
