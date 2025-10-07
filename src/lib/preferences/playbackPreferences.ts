import type { UserPreferences } from '@/core/models';
import { readPreferencesFromStorage } from './localPreferences';

type VoiceList = readonly SpeechSynthesisVoice[];

export interface ResolvedPlaybackPreferences {
  /** Whether audio should start muted */
  isMuted: boolean;
  /** Whether playback should begin paused */
  isPaused: boolean;
  /** Voice name stored in preferences, regardless of availability */
  requestedVoice: string | null;
  /** Voice name that matches the available voices */
  resolvedVoice: string | null;
  /** Stored speech rate (if valid) */
  speechRate: number | null;
}

const extractRequestedVoice = (prefs: UserPreferences): string | null => {
  const rawVoice = typeof prefs.favorite_voice === 'string' ? prefs.favorite_voice.trim() : '';
  return rawVoice.length > 0 ? rawVoice : null;
};

const extractSpeechRate = (prefs: UserPreferences): number | null => {
  const rate = prefs.speech_rate;
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : null;
};

const resolveVoiceFromList = (
  requestedVoice: string | null,
  voices: VoiceList | undefined,
): string | null => {
  if (!requestedVoice || !voices || voices.length === 0) {
    return null;
  }

  const match = voices.find(voice => voice.name === requestedVoice);
  return match ? match.name : null;
};

export const resolvePlaybackPreferences = (
  voices?: VoiceList,
): ResolvedPlaybackPreferences => {
  const prefs = readPreferencesFromStorage();
  const requestedVoice = extractRequestedVoice(prefs);

  return {
    isMuted: !!prefs.is_muted,
    isPaused: prefs.is_playing === false,
    requestedVoice,
    resolvedVoice: resolveVoiceFromList(requestedVoice, voices),
    speechRate: extractSpeechRate(prefs),
  };
};
