
import { useEffect, useRef } from 'react';

/**
 * Mobile-specific interaction handler for better touch responsiveness
 */
export const useMobileInteractionHandler = (
  onUserInteraction?: () => void
) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        
        // Detect double tap for user interaction
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          console.log('[MOBILE-INTERACTION] Double tap detected');
          onUserInteraction?.();
        }
        lastTapRef.current = now;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartRef.current && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        
        // Simple swipe detection for future use
        if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
          console.log('[MOBILE-INTERACTION] Swipe detected:', deltaX > 0 ? 'right' : 'left');
          onUserInteraction?.();
        }
      }
      touchStartRef.current = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MOBILE-INTERACTION] Page became visible');
        onUserInteraction?.();
      }
    };

    // Add mobile-specific event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onUserInteraction]);

  return {
    // Can expose touch interaction state if needed
    isTouch: 'ontouchstart' in window
  };
};
