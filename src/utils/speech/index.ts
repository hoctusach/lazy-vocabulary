import { findFallbackVoice, getAllAvailableVoices } from "./voiceUtils";
import { calculateSpeechDuration } from "./durationUtils";
import { speak } from "./core/speechPlayer";
import {
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  keepSpeechAlive,
  waitForSpeechReadiness,
  resetSpeechEngine,
  validateCurrentSpeech,
  ensureSpeechEngineReady,
  isSpeechSynthesisSupported,
} from "./core/speechEngine";
import {
  extractMainWord,
  prepareTextForSpeech,
  addPausesToText,
  checkSoundDisplaySync,
  forceResyncIfNeeded,
} from "./core/speechText";
import {
  getSpeechRate,
  getSpeechPitch,
  getSpeechVolume,
} from "./core/speechSettings";
import { splitTextIntoChunks } from "./core/textChunker";
import { speakChunksInSequence } from "./core/chunkSequencer";
import { createSpeechMonitor, clearSpeechMonitor } from "./core/speechMonitor";
import { synthesizeAudio } from "./synthesisUtils";
import { US_VOICE_NAME, UK_VOICE_NAME, AU_VOICE_NAME } from "./voiceNames";
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
  isSpeechSynthesisSupported,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  checkSoundDisplaySync,
  keepSpeechAlive,
  waitForSpeechReadiness,
  resetSpeechEngine,
  validateCurrentSpeech,
  forceResyncIfNeeded,
  ensureSpeechEngineReady,
  extractMainWord,
  getSpeechRate,
  getSpeechPitch,
  getSpeechVolume,
  prepareTextForSpeech,
  addPausesToText,
  splitTextIntoChunks,
  speakChunksInSequence,
  createSpeechMonitor,
  clearSpeechMonitor,
  synthesizeAudio,
  US_VOICE_NAME,
  UK_VOICE_NAME,
  AU_VOICE_NAME,
  formatSpeechText,
};

export { initializeSpeechSystem, registerSpeechInitGesture, speechInitialized };
