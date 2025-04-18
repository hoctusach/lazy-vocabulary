
export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      console.log('Speech stopped');
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }
};

export const checkSoundDisplaySync = (
  currentWord: string | null, 
  currentTextBeingSpoken: string | null
): boolean => {
  if (!currentWord || !currentTextBeingSpoken) return true;
  
  // More sophisticated sync check - normalize both strings
  const normalizedWord = currentWord.toLowerCase().trim();
  const normalizedText = currentTextBeingSpoken.toLowerCase().trim();
  
  // Check if the text contains the word or if the word is at the beginning
  const containsWord = normalizedText.includes(normalizedWord);
  const startsWithWord = normalizedText.startsWith(normalizedWord);
  
  return containsWord || startsWithWord;
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis) {
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    } catch (error) {
      console.error('Error in keepSpeechAlive:', error);
    }
  }
};

export const waitForSpeechReadiness = (): Promise<void> => {
  return new Promise((resolve) => {
    const checkReady = () => {
      if (window.speechSynthesis && !window.speechSynthesis.speaking) {
        resolve();
      } else {
        setTimeout(checkReady, 50);
      }
    };
    checkReady();
  });
};

export const resetSpeechEngine = (): void => {
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      // Force a reset of the speech system
      setTimeout(() => {
        window.speechSynthesis.resume();
      }, 50);
    } catch (error) {
      console.error('Error resetting speech engine:', error);
    }
  }
};

// Improved sync validation function with better word matching
export const validateCurrentSpeech = (
  currentWord: string | null,
  currentTextBeingSpoken: string | null
): boolean => {
  if (!currentWord || !currentTextBeingSpoken) return false;
  
  // Extract just the main word without phonetics or type
  const mainWord = currentWord.split('(')[0].trim().toLowerCase();
  
  // Get the first part of the text being spoken
  const spokenText = currentTextBeingSpoken.toLowerCase().trim();
  
  // Check if the spoken text clearly contains the main word
  // This is more tolerant of slight variations in formatting
  return spokenText.includes(mainWord);
};

// Enhanced sync mechanism with fallback
export const forceResyncIfNeeded = (
  currentWord: string | null,
  currentTextBeingSpoken: string | null,
  onRestart: () => void
): void => {
  if (!currentWord || !currentTextBeingSpoken) return;
  
  const isInSync = validateCurrentSpeech(currentWord, currentTextBeingSpoken);
  if (!isInSync) {
    console.log('Speech out of sync detected, forcing resync');
    stopSpeaking();
    setTimeout(onRestart, 100);
  }
};

// New function to ensure speech is properly ready before starting
export const ensureSpeechEngineReady = async (): Promise<boolean> => {
  if (!window.speechSynthesis) return false;
  
  try {
    // Force reset the speech engine to clear any stuck states
    window.speechSynthesis.cancel();
    
    // Short delay to allow the engine to reset
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Check if the engine is responsive
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
    
    return true;
  } catch (error) {
    console.error('Error ensuring speech engine is ready:', error);
    return false;
  }
};

// New function to extract the main word from a vocabulary entry
export const extractMainWord = (wordText: string): string => {
  // Remove any phonetic notation and word type
  return wordText.split('(')[0].trim().toLowerCase();
};
