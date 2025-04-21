
export const getSpeechRate = (): number => {
  // Even slower rate to prevent cutting off words
  return 1.0; 
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
    .replace(/\./g, '............. ') // Even longer pause after period
    .replace(/;/g, '........... ') // Longer pause after semicolon
    .replace(/,/g, '.......... ') // Longer pause after comma
    .replace(/\?/g, '............. ') // Longer pause after question mark
    .replace(/!/g, '............. ') // Longer pause after exclamation
    .replace(/:/g, '........... ') // Longer pause after colon
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

// Improved sync checking that's more tolerant of word formats
export const checkSoundDisplaySync = (currentDisplayedWord: string, currentSpokenText: string): boolean => {
  if (!currentDisplayedWord || !currentSpokenText) return false;
  
  // Extract main word more carefully
  const mainWord = extractMainWord(currentDisplayedWord);
  
  // Convert both to lowercase for case-insensitive comparison
  const normalizedSpokenText = currentSpokenText.toLowerCase();
  const normalizedMainWord = mainWord.toLowerCase();
  
  // Check if the word appears anywhere in the spoken text
  const isInSync = normalizedSpokenText.includes(normalizedMainWord);
  
  if (!isInSync) {
    console.log(`Sync check failed: Word "${mainWord}" not found in spoken text "${normalizedSpokenText.substring(0, 50)}..."`);
  }
  
  return isInSync;
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis.speaking) {
    // Even more frequent pause/resume to prevent browser cutting off speech
    window.speechSynthesis.pause();
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 1); // Keep short timeout for more reliable resume
  }
};

export const waitForSpeechReadiness = async (): Promise<void> => {
  // More thorough wait for speech engine to be ready
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    console.log('Waiting for speech engine to be clear');
    stopSpeaking();
    await new Promise(resolve => setTimeout(resolve, 800)); // Longer wait time
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

// Improved sync checking with more detailed word extraction
export const forceResyncIfNeeded = (
  currentWord: string, 
  expectedText: string, 
  resyncCallback: () => void
): void => {
  if (!currentWord || !expectedText) {
    console.log('Missing word or text for sync check');
    return;
  }
  
  // Get main word without any parentheses or formatting
  const mainWord = extractMainWord(currentWord);
  const lowerCaseExpectedText = expectedText.toLowerCase();
  const lowerCaseMainWord = mainWord.toLowerCase();
  
  // Log detailed sync info for debugging
  console.log(`Sync check: Looking for word "${mainWord}" in speech text`);
  
  if (!lowerCaseExpectedText.includes(lowerCaseMainWord) && window.speechSynthesis.speaking) {
    console.log('CRITICAL: Display and speech out of sync, resyncing...');
    console.log(`Current word: "${mainWord}", not found in speech text`);
    console.log(`Speech text (excerpt): "${lowerCaseExpectedText.substring(0, 100)}..."`);
    stopSpeaking();
    setTimeout(resyncCallback, 100); // Quicker resync response
  }
};

export const ensureSpeechEngineReady = async (): Promise<void> => {
  // More thorough speech engine readiness check
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending || window.speechSynthesis.paused) {
    console.log('Ensuring speech engine is ready...');
    stopSpeaking();
    // Longer wait time to ensure engine is fully reset
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
};

// Greatly improved word extraction for more reliable sync checking
export const extractMainWord = (text: string): string => {
  if (!text) return '';
  
  // Remove leading/trailing whitespace
  const cleanText = text.trim();
  
  // First try to extract the text before any parentheses
  // This handles cases like "put (v)" -> "put"
  const beforeParenthesis = cleanText.split(/\s*\(/)[0].trim();
  if (beforeParenthesis) {
    return beforeParenthesis;
  }
  
  // As a fallback, extract the first word-like sequence
  const firstWordMatch = cleanText.match(/^[a-zA-Z0-9'-]+/);
  if (firstWordMatch) {
    return firstWordMatch[0];
  }
  
  // If all else fails, just use the first part until a space or special character
  const simpleMatch = cleanText.match(/^[^.,;:!?\s]+/);
  return simpleMatch ? simpleMatch[0] : cleanText;
};
