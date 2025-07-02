// Utilities for selecting speech synthesis voices
import { logAvailableVoices } from './debug/logVoices';

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
 * Find a specific voice by name. Falls back to the first English voice or the
 * first available voice if no exact match is found.
 */
export const getVoiceByName = (name: string): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  logAvailableVoices(voices);
  if (!voices || voices.length === 0) return null;

  const match = voices.find(v => v.name === name);
  if (match) return match;

  return findFallbackVoice(voices);
};

export const hasAvailableVoices = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }
    const list = window.speechSynthesis.getVoices();
    logAvailableVoices(list);
    return list.length > 0;
  } catch {
    return false;
  }
};

export const getAllAvailableVoices = (): SpeechSynthesisVoice[] => {
  const voices = window.speechSynthesis.getVoices();
  logAvailableVoices(voices);
  return voices;
};
