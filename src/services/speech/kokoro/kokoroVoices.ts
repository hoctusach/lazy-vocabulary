import { DEFAULT_SPEECH_RATE } from '../core/constants';

export interface KokoroVoice {
  id: 'af_heart' | 'am_michael';
  sid: number;
  name: string;
  gender: 'female' | 'male';
  baseSpeed: number;
}

export const KOKORO_VOICES: KokoroVoice[] = [
  { id: 'af_heart', sid: 3, name: 'Kokoro Heart (US female)', gender: 'female', baseSpeed: 0.95 },
  { id: 'am_michael', sid: 16, name: 'Kokoro Michael (US male)', gender: 'male', baseSpeed: 1.0 },
];

/** Fallback size of the fp32 model download; the real size comes from the native status (downloadSize). */
export const KOKORO_DOWNLOAD_BYTES = 332562608;

export function getKokoroVoiceByName(name: string | null | undefined): KokoroVoice | undefined {
  if (!name) return undefined;
  return KOKORO_VOICES.find((v) => v.name === name || `kokoro:${v.id}` === name || v.id === name);
}

export function isKokoroVoiceName(name: string | null | undefined): boolean {
  return getKokoroVoiceByName(name) !== undefined;
}

/** Map the app's speech rate (0.8 = default) onto Kokoro's speed parameter. */
export function mapRateToKokoroSpeed(rate: number, voice: KokoroVoice): number {
  if (!Number.isFinite(rate)) return voice.baseSpeed;
  return Math.min(2.0, Math.max(0.5, (voice.baseSpeed * rate) / DEFAULT_SPEECH_RATE));
}
