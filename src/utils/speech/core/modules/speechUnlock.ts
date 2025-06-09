
// Enhanced unlockAudio function with better error handling
export const unlockAudio = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log('[ENGINE] Attempting to unlock audio context...');
      
      interface WindowWithWebAudio extends Window {
        webkitAudioContext?: typeof globalThis.AudioContext;
      }

      const AudioContext =
        window.AudioContext || (window as WindowWithWebAudio).webkitAudioContext;
      
      if (!AudioContext) {
        console.log('[ENGINE] AudioContext not supported, proceeding with speech synthesis');
        resolve(true);
        return;
      }
      
      try {
        const context = new AudioContext();
        
        console.log('[ENGINE] AudioContext created, state:', context.state);
        
        if (context.state === 'suspended') {
          context.resume().then(() => {
            console.log('[ENGINE] ✓ AudioContext resumed successfully');
            resolve(true);
          }).catch(err => {
            console.warn('[ENGINE] Failed to resume AudioContext:', err);
            resolve(true); // Still allow speech synthesis to try
          });
        } else {
          console.log('[ENGINE] ✓ AudioContext already ready');
          resolve(true);
        }
      } catch (e) {
        console.warn('[ENGINE] AudioContext creation failed:', e);
        resolve(true); // Still allow speech synthesis to try
      }
    } catch (e) {
      console.warn('[ENGINE] Audio unlock failed, continuing anyway:', e);
      resolve(true);
    }
  });
};
