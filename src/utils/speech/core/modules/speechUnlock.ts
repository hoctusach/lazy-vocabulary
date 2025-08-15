// Attempt to unlock browser audio using a silent utterance.
// This resolves once the attempt completes so subsequent speech
// requests aren't blocked by autoplay restrictions.
let audioCtx: AudioContext | null = null;

export const unlockAudio = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log("[ENGINE] Attempting audio unlock");

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          if (!audioCtx) {
            audioCtx = new AudioCtx();
          }
          if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
          }
        } catch (err) {
          console.warn("[ENGINE] AudioContext resume failed:", err);
        }
      }

      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0.01;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);

      try {
        window.speechSynthesis.speak(u);
        setTimeout(() => resolve(true), 200);
      } catch (err) {
        console.warn("[ENGINE] Speech unlock failed:", err);
        resolve(false);
      }
    } catch (e) {
      console.warn("[ENGINE] Audio unlock failed:", e);
      resolve(false);
    }
  });
};
