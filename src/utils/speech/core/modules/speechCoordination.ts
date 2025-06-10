// Enhanced coordination module with immediate pause response
let activeSpeechId: string | null = null;
import { SpeechOptions } from '../../controller/types';

let speechQueue: Array<{ id: string; text: string; options: SpeechOptions }> = [];
let isProcessingQueue = false;
let isPausedGlobally = false;

export const registerSpeechRequest = (
  speechId: string,
  text: string,
  options: SpeechOptions
): boolean => {
  console.log(`[COORDINATION] Registering speech request: ${speechId}`);
  
  // Check if speech is globally paused - immediately reject
  if (isPausedGlobally || window.speechSynthesis?.paused) {
    console.log(`[COORDINATION] ✗ Speech is paused globally, rejecting request ${speechId}`);
    return false;
  }
  
  // If there's already active speech, queue this request
  if (activeSpeechId && activeSpeechId !== speechId) {
    console.log(`[COORDINATION] Queueing speech request ${speechId} (active: ${activeSpeechId})`);
    speechQueue.push({ id: speechId, text, options });
    return false;
  }
  
  activeSpeechId = speechId;
  console.log(`[COORDINATION] ✓ Speech request ${speechId} is now active`);
  return true;
};

export const unregisterSpeechRequest = (speechId: string): void => {
  console.log(`[COORDINATION] Unregistering speech request: ${speechId}`);
  
  if (activeSpeechId === speechId) {
    activeSpeechId = null;
    // Only process queue if not paused
    if (!isPausedGlobally && !window.speechSynthesis?.paused) {
      processNextInQueue();
    }
  }
};

export const isActiveSpeechRequest = (speechId: string): boolean => {
  return activeSpeechId === speechId;
};

export const getCurrentActiveSpeech = (): string | null => {
  return activeSpeechId;
};

export const clearAllSpeechRequests = (): void => {
  console.log('[COORDINATION] Clearing all speech requests');
  activeSpeechId = null;
  speechQueue = [];
  isProcessingQueue = false;
};

// New function to set global pause state
export const setGlobalPauseState = (paused: boolean): void => {
  console.log(`[COORDINATION] Setting global pause state: ${paused}`);
  isPausedGlobally = paused;
  
  if (paused) {
    // When pausing, clear the queue but keep active speech tracked
    speechQueue = [];
  }
};

export const isGloballyPaused = (): boolean => {
  return isPausedGlobally;
};

const processNextInQueue = (): void => {
  if (isProcessingQueue || speechQueue.length === 0) return;
  
  // Don't process queue if speech is paused
  if (isPausedGlobally || window.speechSynthesis?.paused) {
    console.log('[COORDINATION] Speech is paused, not processing queue');
    return;
  }
  
  isProcessingQueue = true;
  const nextRequest = speechQueue.shift();
  
  if (nextRequest) {
    console.log(`[COORDINATION] Processing queued speech: ${nextRequest.id}`);
    // This would trigger the next speech request
    // For now, we'll just clear the processing flag
  }
  
  isProcessingQueue = false;
};
