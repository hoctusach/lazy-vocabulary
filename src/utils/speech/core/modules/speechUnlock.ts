
// Audio unlocking is no longer required. The function now immediately resolves.
export const unlockAudio = (): Promise<boolean> => {
  console.log('[ENGINE] Audio unlock skipped');
  return Promise.resolve(true);
};
