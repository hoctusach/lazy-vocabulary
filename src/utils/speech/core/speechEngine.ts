
// Re-export all functions from the modular components
export {
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  keepSpeechAlive,
  resetSpeechEngine
} from './modules/speechControl';

export {
  waitForSpeechReadiness,
  validateCurrentSpeech,
  ensureSpeechEngineReady,
  isSpeechSynthesisSupported
} from './modules/speechValidation';

export {
  unlockAudio
} from './modules/speechUnlock';

export {
  loadVoicesAndWait
} from './modules/speechVoiceLoader';

export {
  speakWithRetry
} from './modules/speechSynthesis';

export {
  canPerformOperation
} from './modules/speechThrottling';
