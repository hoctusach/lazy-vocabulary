
// Enhanced coordination module to prevent premature speech cancellation
let activeSpeechId: string | null = null;
let speechQueue: Array<{ id: string; text: string; options: any }> = [];
let isProcessingQueue = false;

export const registerSpeechRequest = (speechId: string, text: string, options: any): boolean => {
  console.log(`[COORDINATION] Registering speech request: ${speechId}`);
  
  // If there's already active speech, queue this request
  if (activeSpeechId && activeSpeechId !== speechId) {
    console.log(`[COORDINATION] Queueing speech request ${speechId} (active: ${activeSpeechId})`);
    speechQueue.push({ id: speechId, text, options });
    return false;
  }
  
  activeSpeechId = speechId;
  console.log(`[COORDINATION] Speech request ${speechId} is now active`);
  return true;
};

export const unregisterSpeechRequest = (speechId: string): void => {
  console.log(`[COORDINATION] Unregistering speech request: ${speechId}`);
  
  if (activeSpeechId === speechId) {
    activeSpeechId = null;
    processNextInQueue();
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

const processNextInQueue = (): void => {
  if (isProcessingQueue || speechQueue.length === 0) return;
  
  isProcessingQueue = true;
  const nextRequest = speechQueue.shift();
  
  if (nextRequest) {
    console.log(`[COORDINATION] Processing queued speech: ${nextRequest.id}`);
    // This would trigger the next speech request
    // For now, we'll just clear the processing flag
  }
  
  isProcessingQueue = false;
};
