import { findFallbackVoice, getAllAvailableVoices } from "./voiceUtils";
import { calculateSpeechDuration } from "./durationUtils";
import { speak } from "./core/speechPlayer";
import {
  stopSpeaking,
  keepSpeechAlive,
  ensureSpeechEngineReady,
  isSpeechSynthesisSupported,
} from "./core/speechEngine";
import {
  extractMainWord,
  prepareTextForSpeech,
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
  keepSpeechAlive,
  forceResyncIfNeeded,
  ensureSpeechEngineReady,
  extractMainWord,
  getSpeechRate,
  getSpeechPitch,
  getSpeechVolume,
  prepareTextForSpeech,
  splitTextIntoChunks,
  speakChunksInSequence,
  createSpeechMonitor,
  clearSpeechMonitor,
  synthesizeAudio,
  formatSpeechText,
};

export { initializeSpeechSystem, registerSpeechInitGesture, speechInitialized };
