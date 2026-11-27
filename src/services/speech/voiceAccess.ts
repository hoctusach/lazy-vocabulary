import { hasFeature } from '@/services/billing/proFeatures';
import { KOKORO_VOICES, getKokoroVoiceByName, type KokoroVoice } from './kokoro/kokoroVoices';

/** Kokoro Michael (male) is a Pro voice; Heart and every system voice are free. */
export function isProVoice(kv: KokoroVoice | undefined | null): boolean {
  return !!kv && kv.gender === 'male';
}

/** True when this voice name is a Pro voice the user may not use right now. */
export function isVoiceLocked(name: string | null | undefined): boolean {
  return isProVoice(getKokoroVoiceByName(name)) && !hasFeature('maleVoice');
}

/** The free Kokoro voice (Heart) used when a locked voice is requested. */
export function freeKokoroVoice(): KokoroVoice {
  return KOKORO_VOICES.find((v) => !isProVoice(v)) ?? KOKORO_VOICES[0];
}

/**
 * A saved/requested voice name a non-Pro user may actually use: Michael becomes Heart. Heart then resolves against the
 * listed voices as usual, i.e. falls back to a system voice when Kokoro is not ready.
 */
export function sanitizeVoiceName<T extends string | null | undefined>(name: T): T | string {
  return isVoiceLocked(name) ? freeKokoroVoice().name : name;
}

/**
 * Next voice in the cycle that the user may use. Locked voices (only Kokoro Michael, for free users) are skipped
 * silently: landing on a free voice must never open the upgrade sheet (FB-29: it made system voices feel locked).
 * Michael stays discoverable through a locked row in the Audio sheet, which opens the upgrade sheet on tap.
 */
export function nextAllowedVoice<T extends { name: string }>(voices: T[], currentName: string): T | null {
  if (voices.length < 2) return null;
  const start = voices.findIndex((v) => v.name === currentName);
  for (let step = 1; step <= voices.length; step++) {
    const candidate = voices[(start + step + voices.length) % voices.length];
    if (!isVoiceLocked(candidate.name)) return candidate;
  }
  return null;
}

/** The locked Pro voice a free user should see as a locked row (Michael), or null when nothing is locked/listed. */
export function lockedProVoiceIn<T extends { name: string }>(voices: T[]): T | null {
  return voices.find((v) => isVoiceLocked(v.name)) ?? null;
}
