export const getSpeechRate = (): number => {
  // Even slower rate to prevent cutting off words
  return 0.5; // Reduced from 0.6 to 0.5
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
  // Add much longer pauses to improve comprehension and prevent cutting off
  return text
    .replace(/\./g, '........ ') // Even longer pause after period
    .replace(/;/g, '...... ') // Longer pause after semicolon
    .replace(/,/g, '..... ') // Longer pause after comma
    .replace(/\?/g, '........ ') // Longer pause after question mark
    .replace(/!/g, '........ ') // Longer pause after exclamation
    .replace(/:/g, '...... ') // Longer pause after colon
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
  if (!currentDisplayedWord || !currentSpokenText) return false;
  const mainWord = extractMainWord(currentDisplayedWord);
  return currentSpokenText.toLowerCase().includes(mainWord.toLowerCase());
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis.speaking) {
    // Even more frequent pause/resume to prevent browser cutting off speech
    window.speechSynthesis.pause();
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 1); // Even shorter timeout for more reliable resume
  }
};

export const waitForSpeechReadiness = async (): Promise<void> => {
  // More thorough wait for speech engine to be ready
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    console.log('Waiting for speech engine to be clear');
    stopSpeaking();
    await new Promise(resolve => setTimeout(resolve, 500)); // Longer wait time
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
  // Improved sync checking with more detailed logging
  if (!currentWord || !expectedText) {
    console.log('Missing word or text for sync check');
    return;
  }
  
  const mainWord = extractMainWord(currentWord);
  const lowerCaseExpectedText = expectedText.toLowerCase();
  const lowerCaseMainWord = mainWord.toLowerCase();
  
  if (!lowerCaseExpectedText.includes(lowerCaseMainWord) && window.speechSynthesis.speaking) {
    console.log('Display and speech out of sync, resyncing...');
    console.log(`Current word: "${mainWord}", not found in speech text`);
    console.log(`Speech text (excerpt): "${lowerCaseExpectedText.substring(0, 50)}..."`);
    stopSpeaking();
    setTimeout(resyncCallback, 50); // Even quicker resync response
  }
};

export const ensureSpeechEngineReady = async (): Promise<void> => {
  // More thorough speech engine readiness check
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending || window.speechSynthesis.paused) {
    console.log('Ensuring speech engine is ready...');
    stopSpeaking();
    // Longer wait time to ensure engine is fully reset
    await new Promise(resolve => setTimeout(resolve, 900));
  }
};

export const extractMainWord = (text: string): string => {
  if (!text) return '';
  
  // More robust word extraction
  const cleanText = text.trim().toLowerCase();
  
  // First try to get word before any punctuation or special character
  const firstWordMatch = cleanText.match(/^[a-zA-Z0-9'-]+/);
  
  if (firstWordMatch) {
    return firstWordMatch[0];
  }
  
  // If no simple word is found, just return the first part until a space or special character
  const simpleMatch = cleanText.match(/^[^.,;:!?\s]+/);
  return simpleMatch ? simpleMatch[0] : cleanText;
};
