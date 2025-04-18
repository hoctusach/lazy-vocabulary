
export const getSpeechRate = (): number => {
  // Set speech rate to a much slower 0.7 to make speech clearer
  return 0.7;
};

export const getSpeechPitch = (): number => {
  // Default pitch setting
  return 1.0;
};

export const getSpeechVolume = (): number => {
  // Default volume setting
  return 1.0;
};

export const addPausesToText = (text: string): string => {
  // Add more strategic pauses to improve comprehension
  return text
    .replace(/\./g, '... ') // Longer pause after period
    .replace(/;/g, '... ') // Longer pause after semicolon
    .replace(/,/g, '... ') // Longer pause after comma
    .replace(/\?/g, '... ') // Longer pause after question mark
    .replace(/!/g, '... ') // Longer pause after exclamation
    .replace(/:/g, '... ') // Pause after colon
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const prepareTextForSpeech = (text: string): string => {
  // Prepare text for better speech quality
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
};

export const isSpeechSynthesisSupported = (): boolean => {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    console.log('Speech stopped');
  }
};

export const checkSoundDisplaySync = (currentDisplayedWord: string, currentSpokenText: string): boolean => {
  const mainWord = extractMainWord(currentDisplayedWord);
  return currentSpokenText.toLowerCase().includes(mainWord.toLowerCase());
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }
};

export const waitForSpeechReadiness = async (): Promise<void> => {
  // Wait for speech engine to be ready
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    console.log('Waiting for speech engine to be clear');
    stopSpeaking();
    await new Promise(resolve => setTimeout(resolve, 250));
  }
};

export const resetSpeechEngine = (): void => {
  stopSpeaking();
  console.log('Speech engine reset');
};

export const validateCurrentSpeech = (expectedText: string): boolean => {
  try {
    const currentText = localStorage.getItem('currentTextBeingSpoken');
    if (!currentText) return false;
    
    return expectedText === currentText;
  } catch (error) {
    console.error('Error validating speech:', error);
    return false;
  }
};

export const forceResyncIfNeeded = (
  currentWord: string, 
  expectedText: string, 
  resyncCallback: () => void
): void => {
  // Check if current display and speech are in sync
  const mainWord = extractMainWord(currentWord);
  if (!expectedText.toLowerCase().includes(mainWord.toLowerCase()) && window.speechSynthesis.speaking) {
    console.log('Display and speech out of sync, resyncing...');
    stopSpeaking();
    resyncCallback();
  }
};

export const ensureSpeechEngineReady = async (): Promise<void> => {
  // Ensure speech engine is ready for use
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    stopSpeaking();
    await new Promise(resolve => setTimeout(resolve, 300));
  }
};

export const extractMainWord = (text: string): string => {
  // Extract the main word from a potentially complex string
  // (e.g., "apple - a fruit" becomes "apple")
  const cleanText = text.trim().toLowerCase();
  const firstWordMatch = cleanText.match(/^[a-zA-Z0-9-]+/);
  
  if (firstWordMatch) {
    return firstWordMatch[0];
  }
  
  // If no simple word is found, just return the first part until a space or special character
  const simpleMatch = cleanText.match(/^[^.,;:!?\s]+/);
  return simpleMatch ? simpleMatch[0] : cleanText;
};
