export let speechInitialized = false;
let initPromise: Promise<void> | null = null;

import { unlockAudio } from "./speechUnlock";
import { loadVoicesAndWait } from "./speechVoiceLoader";

/**
 * Initialize speech synthesis on first user gesture.
 * Subsequent calls return the same promise.
 */
export const initializeSpeechSystem = async (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await unlockAudio();
    if (!speechInitialized) {
      await loadVoicesAndWait();
      speechInitialized = true;
    }
  })();

  await initPromise;
  initPromise = null;
};

/**
 * Registers event listeners to trigger initialization on the next
 * user gesture (click, touchstart, keydown).
 */
export const registerSpeechInitGesture = () => {
  if (speechInitialized || initPromise) return;

  const handleGesture = () => {
    document.removeEventListener("click", handleGesture);
    document.removeEventListener("touchstart", handleGesture);
    document.removeEventListener("keydown", handleGesture);
    initializeSpeechSystem();
  };

  const listenerOptions: AddEventListenerOptions = { once: true, capture: true };
  document.addEventListener("click", handleGesture, listenerOptions);
  document.addEventListener("touchstart", handleGesture, listenerOptions);
  document.addEventListener("keydown", handleGesture, listenerOptions);
};
