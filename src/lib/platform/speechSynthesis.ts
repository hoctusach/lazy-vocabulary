/**
 * Web Speech is available in Android System WebView (Chromium) and iOS WKWebView.
 * A native TTS plugin would bypass the existing utterance, voice, and rate pipeline,
 * so playback stays on speechSynthesis and this guard only prevents a hard crash
 * when a WebView has no speech engine.
 */
export function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof synth.speak !== 'function') return null;
    return synth;
  } catch {
    return null;
  }
}

export function canUseSpeechSynthesis(): boolean {
  return (
    getSpeechSynthesis() !== null &&
    typeof window !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}
