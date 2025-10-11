import { findFallbackVoice, getAllAvailableVoices } from "./voiceUtils";
import { calculateSpeechDuration } from "./durationUtils";
import { speak } from "./core/speechPlayer";
import {
  stopSpeaking,
  keepSpeechAlive,
  ensureSpeechEngineReady,
} from "./core/speechEngine";
import { extractMainWord, prepareTextForSpeech, forceResyncIfNeeded, cleanSpeechText } from "./core/speechText";
import {
  getSpeechRate,
  getSpeechPitch,
  getSpeechVolume,
} from "./core/speechSettings";
import { formatSpeechText } from "./formatSpeechText";
import {
  initializeSpeechSystem,
  registerSpeechInitGesture,
  speechInitialized,
} from "./core/speechEngine";

export {
  speak,
  findFallbackVoice,
  getAllAvailableVoices,
  calculateSpeechDuration,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  keepSpeechAlive,
  forceResyncIfNeeded,
  ensureSpeechEngineReady,
  extractMainWord,
  cleanSpeechText,
  getSpeechRate,
  getSpeechPitch,
  getSpeechVolume,
  prepareTextForSpeech,
  formatSpeechText,
};

export { initializeSpeechSystem, registerSpeechInitGesture, speechInitialized };
