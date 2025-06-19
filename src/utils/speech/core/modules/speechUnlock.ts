
// Attempt to unlock browser audio using a silent utterance.
// This resolves once the attempt completes so subsequent speech
// requests aren't blocked by autoplay restrictions.
export const unlockAudio = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log('[ENGINE] Attempting audio unlock');

      // Resume an AudioContext if the browser supports it
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        } catch (err) {
          console.warn('[ENGINE] AudioContext resume failed:', err);
        }
      }

      // Speak a silent utterance to unlock speech synthesis
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);

      try {
        window.speechSynthesis.speak(u);
        // Resolve if nothing happens after a short delay
        setTimeout(() => resolve(true), 200);
      } catch (err) {
        console.warn('[ENGINE] Speech unlock failed:', err);
        resolve(false);
      }
    } catch (e) {
      console.warn('[ENGINE] Audio unlock failed:', e);
      resolve(false);
    }
  });
};
