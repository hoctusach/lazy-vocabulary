
import { useEffect, useRef } from 'react';

/**
 * Enhanced mobile interaction handler with proper audio context management
 */
export const useMobileInteractionHandler = (
  onUserInteraction?: () => void
) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasInitializedAudioRef = useRef(false);

  const initializeAudioContext = async () => {
    if (hasInitializedAudioRef.current) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext && !audioContextRef.current) {
        console.log('[MOBILE-INTERACTION] Initializing audio context');
        audioContextRef.current = new AudioContext();
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('[MOBILE-INTERACTION] ✓ Audio context resumed');
        }
        
        hasInitializedAudioRef.current = true;
      }
    } catch (error) {
      console.warn('[MOBILE-INTERACTION] Audio context initialization failed:', error);
    }
  };

  useEffect(() => {
    const handleTouchStart = async (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        
        // Initialize audio context on first touch
        await initializeAudioContext();
        
        // Detect double tap for user interaction
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          console.log('[MOBILE-INTERACTION] Double tap detected - triggering user interaction');
          onUserInteraction?.();
        }
        lastTapRef.current = now;
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (touchStartRef.current && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        
        // Initialize audio context on touch end as well
        await initializeAudioContext();
        
        // Simple swipe detection
        if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
          console.log('[MOBILE-INTERACTION] Swipe detected:', deltaX > 0 ? 'right' : 'left');
          onUserInteraction?.();
        }
      }
      touchStartRef.current = null;
    };

    const handleClick = async () => {
      console.log('[MOBILE-INTERACTION] Click detected - initializing audio');
      await initializeAudioContext();
      onUserInteraction?.();
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[MOBILE-INTERACTION] Page became visible - resuming audio context');
        
        // Resume audio context when page becomes visible
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          try {
            await audioContextRef.current.resume();
            console.log('[MOBILE-INTERACTION] ✓ Audio context resumed on visibility change');
          } catch (error) {
            console.warn('[MOBILE-INTERACTION] Failed to resume audio context:', error);
          }
        }
        
        onUserInteraction?.();
      }
    };

    const handlePageShow = async () => {
      console.log('[MOBILE-INTERACTION] Page show event - ensuring audio readiness');
      await initializeAudioContext();
      onUserInteraction?.();
    };

    // Add comprehensive mobile event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    // Cleanup function
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [onUserInteraction]);

  return {
    isTouch: 'ontouchstart' in window,
    hasAudioContext: !!audioContextRef.current,
    audioContextState: audioContextRef.current?.state || 'unknown'
  };
};
