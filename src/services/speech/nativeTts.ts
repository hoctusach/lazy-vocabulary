import { Capacitor } from '@capacitor/core';
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

/** Index of the best voice for a lang (exact, then primary-language match), or undefined. */
export function pickVoiceIndex(voices: NativeVoice[], lang: string | undefined, name?: string): number | undefined {
  if (name) {
    const byName = voices.findIndex((v) => v.name === name || v.voiceURI === name);
    if (byName >= 0) return byName;
  }
  if (!lang) return undefined;
  const l = lang.toLowerCase().replace('_', '-');
  const exact = voices.findIndex((v) => v.lang.toLowerCase().replace('_', '-') === l);
  if (exact >= 0) return exact;
  const primary = l.split('-')[0];
  const loose = voices.findIndex((v) => v.lang.toLowerCase().replace('_', '-').split('-')[0] === primary);
  return loose >= 0 ? loose : undefined;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Map Web Speech utterance settings onto the plugin's options (rate 1.0 ≈ 1.0). */
export function buildSpeakOptions(
  u: { text: string; lang?: string; rate?: number; pitch?: number; volume?: number },
  voiceIndex?: number,
): TTSOptions {
  const opts: TTSOptions = {
    text: u.text,
    lang: u.lang || 'en-US',
    rate: clamp(Number.isFinite(u.rate) ? (u.rate as number) : 1, 0.1, 4),
    pitch: clamp(Number.isFinite(u.pitch) ? (u.pitch as number) : 1, 0.1, 2),
    volume: clamp(Number.isFinite(u.volume) ? (u.volume as number) : 1, 0, 1),
  };
  if (voiceIndex !== undefined) opts.voice = voiceIndex;
  return opts;
}
