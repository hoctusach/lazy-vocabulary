/**
 * [FB-68] iOS background playback / lock-screen "Now Playing" fallback (no custom Swift plugin).
 *
 * iOS has no foreground-service notification. What it does have: UIBackgroundModes=audio (Info.plist) + a live
 * audio session. WKWebView exposes the Media Session API (iOS 15+) and shows Now Playing (lock screen, Control
 * Center, AirPods/Bluetooth keys) as long as a media element is playing. So while words are advancing we loop a
 * silent, generated WAV in an <audio> element and publish the word through `navigator.mediaSession` (metadata +
 * play/pause/next handlers, wired in playbackService). Speech itself is AVSpeechSynthesizer via the TTS plugin
 * with the `playback` audio-session category (see buildSpeakOptions).
 *
 * Limits (need a real device to tune, see IOS_PLAN.md): no native queue that keeps advancing if iOS suspends the
 * WebView, no BigText card, no Kokoro. Everything here is a no-op off iOS.
 */

let audio: HTMLAudioElement | null = null;
let url: string | null = null;

/** ~1s of 8 kHz mono 8-bit silence as a WAV blob URL. */
export function buildSilentWavBytes(seconds = 1, rate = 8000): Uint8Array {
  const n = Math.max(1, Math.round(seconds * rate));
  const buf = new Uint8Array(44 + n);
  const dv = new DataView(buf.buffer);
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) buf[o + i] = t.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  str(36, 'data'); dv.setUint32(40, n, true);
  buf.fill(128, 44); // 8-bit PCM silence = 0x80
  return buf;
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return null;
  if (audio) return audio;
  try {
    url = URL.createObjectURL(new Blob([buildSilentWavBytes() as BlobPart], { type: 'audio/wav' }));
    audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.01; // inaudible but non-zero so the session counts as "playing"
    audio.setAttribute('playsinline', '');
  } catch {
    audio = null;
  }
  return audio;
}

/** Start/resume the silent loop that keeps the iOS audio session + Now Playing card alive. */
export async function startIosNowPlaying(): Promise<void> {
  const a = ensureAudio();
  if (!a) return;
  try {
    await a.play();
  } catch (e) {
    console.warn('[iosNowPlaying] play blocked', e); // needs a user gesture first; the next word tries again
  }
}

/** Paused: keep the card (metadata stays) but let the session go quiet. */
export function pauseIosNowPlaying(): void {
  try { audio?.pause(); } catch { /* ignore */ }
}

export function stopIosNowPlaying(): void {
  try { audio?.pause(); } catch { /* ignore */ }
  audio = null;
  if (url) { try { URL.revokeObjectURL(url); } catch { /* ignore */ } url = null; }
}

export function __isIosNowPlayingActiveForTests(): boolean {
  return !!audio;
}
