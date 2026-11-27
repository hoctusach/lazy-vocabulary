import { Capacitor } from '@capacitor/core';
import { nativePlatform } from '@/lib/platform/platformKind';
import type { TextToSpeechPlugin, TTSOptions } from '@capacitor-community/text-to-speech';

export interface NativeVoice {
  default: boolean;
  lang: string;
  localService: boolean;
  name: string;
  voiceURI: string;
}

// Wrapped in an object: Capacitor plugin proxies must not be resolved directly from a promise (they'd be treated as thenables).
export interface NativeTtsHandle { tts: TextToSpeechPlugin }

let pluginPromise: Promise<NativeTtsHandle | null> | null = null;

/** Lazily imports the native plugin so web bundles don't execute it eagerly. */
export function loadNativeTts(): Promise<NativeTtsHandle | null> {
  // Off-device the plugin's web implementation just calls window.speechSynthesis, which is
  // our shim when Web Speech is missing: shim.cancel -> plugin.stop -> shim.cancel... froze
  // the page (REG-02/EDGE-10). Only the native engine is useful here.
  if (!isNativePlatform()) return Promise.resolve(null);
  if (!pluginPromise) {
    pluginPromise = import('@capacitor-community/text-to-speech')
      .then((m) => ({ tts: m.TextToSpeech as TextToSpeechPlugin }))
      .catch(() => null);
  }
  return pluginPromise;
}

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Use the native engine when running natively, or when Web Speech is missing. */
export function shouldUseNativeTts(webSpeechPresent: boolean): boolean {
  return isNativePlatform() || !webSpeechPresent;
}

/**
 * [FB-68] iOS (AVSpeechSynthesizer) voice quality. voiceURI looks like `com.apple.voice.premium.en-US.Zoe`,
 * `com.apple.voice.enhanced.en-US.Samantha`, `com.apple.voice.compact.en-US.Samantha`; the old novelty voices
 * (Bells, Zarvox, ...) are `com.apple.speech.synthesis.voice.*` and must never be auto-picked or listed.
 */
export function iosVoiceRank(v: Pick<NativeVoice, 'voiceURI' | 'name'>): number {
  const id = (v.voiceURI || '').toLowerCase();
  if (id.includes('com.apple.speech.synthesis.voice')) return -1; // novelty
  if (id.includes('.premium.')) return 3;
  if (id.includes('.enhanced.')) return 2;
  if (id.includes('.compact.')) return 1;
  return 1;
}

/** iOS: drop novelty voices from the list the user can choose from. */
export function filterIosVoices<T extends Pick<NativeVoice, 'voiceURI' | 'name'>>(voices: readonly T[]): T[] {
  return voices.filter((v) => iosVoiceRank(v) >= 0);
}

/**
 * Index of the best voice for a lang (exact, then primary-language match), or undefined.
 * On iOS the highest-quality voice of the matching language wins (premium > enhanced > compact, never novelty).
 */
export function pickVoiceIndex(voices: NativeVoice[], lang: string | undefined, name?: string, platform: string | null = nativePlatform()): number | undefined {
  if (name) {
    const byName = voices.findIndex((v) => v.name === name || v.voiceURI === name);
    if (byName >= 0) return byName;
  }
  if (!lang) return undefined;
  const l = lang.toLowerCase().replace('_', '-');
  const primary = l.split('-')[0];
  const norm = (v: NativeVoice) => v.lang.toLowerCase().replace('_', '-');
  const best = (match: (v: NativeVoice) => boolean): number | undefined => {
    let at = -1;
    voices.forEach((v, i) => {
      if (!match(v)) return;
      if (platform !== 'ios') { if (at < 0) at = i; return; }
      const r = iosVoiceRank(v);
      if (r >= 0 && (at < 0 || r > iosVoiceRank(voices[at]))) at = i;
    });
    return at >= 0 ? at : undefined;
  };
  return best((v) => norm(v) === l) ?? best((v) => norm(v).split('-')[0] === primary);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Map Web Speech utterance settings onto the plugin's options (rate 1.0 ≈ 1.0). */
export function buildSpeakOptions(
  u: { text: string; lang?: string; rate?: number; pitch?: number; volume?: number },
  voiceIndex?: number,
  platform: string | null = nativePlatform(),
): TTSOptions {
  const opts: TTSOptions = {
    text: u.text,
    lang: u.lang || 'en-US',
    rate: clamp(Number.isFinite(u.rate) ? (u.rate as number) : 1, 0.1, 4),
    pitch: clamp(Number.isFinite(u.pitch) ? (u.pitch as number) : 1, 0.1, 2),
    volume: clamp(Number.isFinite(u.volume) ? (u.volume as number) : 1, 0, 1),
  };
  if (voiceIndex !== undefined) opts.voice = voiceIndex;
  // iOS: the plugin default session category is 'ambient' (silent-switch muted, no background audio). 'playback'
  // + UIBackgroundModes=audio lets speech continue with the screen locked.
  if (platform === 'ios') opts.category = 'playback';
  return opts;
}
