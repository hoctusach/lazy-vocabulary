/**
 * Safe accessors for the Web Speech API. Android System WebView does not
 * implement it, so `window.speechSynthesis` may be undefined. Always go
 * through these helpers (or guard) instead of touching it directly.
 */
export function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

export function hasWebSpeech(): boolean {
  return (
    getSynth() !== null &&
    typeof window !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/** Subscribe to `voiceschanged`. Returns an unsubscribe function (a no-op if unsupported). */
export function onVoicesChanged(cb: () => void): () => void {
  const synth = getSynth();
  if (!synth || typeof synth.addEventListener !== 'function') return () => {};
  synth.addEventListener('voiceschanged', cb);
  return () => {
    try {
      synth.removeEventListener('voiceschanged', cb);
    } catch {
      /* ignore */
    }
  };
}
