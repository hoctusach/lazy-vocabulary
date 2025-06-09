
// Main speech engine - re-exports all core functionality from focused modules
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

export {
  registerSpeechRequest,
  unregisterSpeechRequest,
  isActiveSpeechRequest,
  getCurrentActiveSpeech,
  clearAllSpeechRequests
} from './modules/speechCoordination';
