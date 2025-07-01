import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { PREFERRED_VOICES_BY_REGION } from './voiceNames';

/**
 * Return the first English voice available. Used as a final fallback.
 */
export const findFallbackVoice = (
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) {
    return null;
  }

  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  return englishVoice || voices[0];
};

/**
 * Get the best available voice for a region using an ordered preference list.
 */
export const getVoiceByRegion = (
  region: 'US' | 'UK' | 'AU'
): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  console.log(`[Voice Picker] Selecting voice for region ${region}. ${voices.length} voices available`);

  if (!voices || voices.length === 0) {
    return null;
  }

  // Filter out problematic voices on Apple platforms
  const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
  const BAD_APPLE_VOICE_NAMES = ['Eloquence', 'Shelley', 'Moira'];
  const usableVoices = isApple
    ? voices.filter(v => !BAD_APPLE_VOICE_NAMES.some(bad => v.name.includes(bad)))
    : voices;

  const preferredNames = PREFERRED_VOICES_BY_REGION[region];
  for (const name of preferredNames) {
    const match = usableVoices.find(v => v.name === name || v.lang === name);
    if (match) {
      console.log(`[Voice Picker] Selected voice ${match.name} (${match.lang})`);
      return match;
    }
  }

  const englishFallback = usableVoices.find(v => v.lang.startsWith('en'));
  if (englishFallback) {
    console.log('[Voice Picker] Falling back to generic English voice', englishFallback.name, englishFallback.lang);
    return englishFallback;
  }

  if (usableVoices.length > 0) {
    console.log('[Voice Picker] Falling back to first available voice', usableVoices[0].name, usableVoices[0].lang);
    return usableVoices[0];
  }

  console.warn('[Voice Picker] No voices available');
  return null;
};

export const getVoiceBySelection = (
  voiceSelection: VoiceSelection
): SpeechSynthesisVoice | null => {
  return getVoiceByRegion(voiceSelection.region);
};

export const hasAvailableVoices = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }
    return window.speechSynthesis.getVoices().length > 0;
  } catch {
    return false;
  }
};
