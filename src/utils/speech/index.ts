
import { getVoiceByRegion, findFallbackVoice } from './voiceUtils';
import { calculateSpeechDuration } from './durationUtils';
import { speak } from './core/speechPlayer';
import {
  stopSpeaking,
  keepSpeechAlive,
  waitForSpeechReadiness,
  resetSpeechEngine,
  validateCurrentSpeech,
  ensureSpeechEngineReady,
  isSpeechSynthesisSupported
} from './core/speechEngine';
import {
  extractMainWord,
  prepareTextForSpeech,
  addPausesToText,
  checkSoundDisplaySync,
  forceResyncIfNeeded
} from './core/speechText';
import {
  getSpeechRate,
  getSpeechPitch,
  getSpeechVolume
} from './core/speechSettings';

export {
  speak,
  findFallbackVoice,
  getVoiceByRegion,
  calculateSpeechDuration,
  isSpeechSynthesisSupported,
  stopSpeaking,
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
  addPausesToText
};
