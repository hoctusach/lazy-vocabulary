import { KOKORO_VOICES, isKokoroVoiceName } from './kokoro/kokoroVoices';
import { isKokoroSupported } from './kokoro/kokoroTts';
import { nativePlatform } from '@/lib/platform/platformKind';
import { loadNativeTts, isNativePlatform, filterIosVoices, type NativeVoice } from './nativeTts';

/**
 * [FB-41] The list of voices the user can pick from = web speechSynthesis voices (incl. the shim's) MERGED with the
 * device's native TTS voices. An empty/unsupported WebView `speechSynthesis` must never hide the installed system voices.
 */
type VoiceLike = Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'voiceURI' | 'localService' | 'default'>;

/** Installed system TTS voices straight from the native plugin ([] off-device or on any failure). */
export async function loadNativeSystemVoices(): Promise<NativeVoice[]> {
  if (!isNativePlatform()) return [];
  try {
    const h = await loadNativeTts();
    const res = h ? await h.tts.getSupportedVoices() : null;
    const list = (res?.voices ?? []) as NativeVoice[];
    return nativePlatform() === 'ios' ? filterIosVoices(list) : list;
  } catch {
    return [];
  }
}

const isEnglish = (v: { lang?: string }) => !!v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('en');

/**
 * Web voices first (Kokoro + whatever the engine lists), then native voices not already present (by name).
 * English voices are preferred; if the device has no English system voice at all, every system voice is kept so the
 * list is never empty. Native-only entries carry their native `index` so the shim can speak with them.
 */
export function mergeSystemVoices(web: readonly VoiceLike[], native: readonly NativeVoice[]): SpeechSynthesisVoice[] {
  const seen = new Set<string>();
  const out: VoiceLike[] = [];
  const add = (v: VoiceLike) => {
    if (!v?.name || seen.has(v.name)) return;
    seen.add(v.name);
    out.push(v);
  };
  web.forEach(add);
  native.forEach((v, index) => {
    add(Object.assign({ name: v.name, lang: v.lang, voiceURI: v.voiceURI || v.name, localService: v.localService, default: v.default }, { index }));
  });
  const english = out.filter((v) => isNaturalVoiceName(v.name) || isEnglish(v));
  const hasEnglishSystem = english.some((v) => !isNaturalVoiceName(v.name));
  return (hasEnglishSystem ? english : out) as SpeechSynthesisVoice[];
}

export const isNaturalVoiceName = (name: string | null | undefined) => isKokoroVoiceName(name);

export interface VoiceGroups<T extends { name: string }> {
  /** Kokoro "natural" voices: Heart, and Michael (shown locked for free users by the UI). */
  natural: T[];
  /** Device / system voices. */
  system: T[];
}

/**
 * Split into the two dropdown groups. Both Kokoro voices are always offered when the platform supports them (so a
 * user can always return to Heart/Michael), even if the engine does not list them right now.
 */
export function groupVoices<T extends { name: string }>(voices: readonly T[], supportsKokoro = isKokoroSupported()): VoiceGroups<T | { name: string }> {
  const natural: (T | { name: string })[] = voices.filter((v) => isNaturalVoiceName(v.name));
  if (supportsKokoro) {
    for (const k of KOKORO_VOICES) if (!natural.some((v) => v.name === k.name)) natural.push({ name: k.name });
  }
  natural.sort((a, b) => KOKORO_VOICES.findIndex((k) => k.name === a.name) - KOKORO_VOICES.findIndex((k) => k.name === b.name));
  return { natural, system: voices.filter((v) => !isNaturalVoiceName(v.name)) };
}
