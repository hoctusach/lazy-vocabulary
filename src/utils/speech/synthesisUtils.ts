
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

// New function to explicitly check if current speech matches current word
export const validateCurrentSpeech = (
  currentWord: string | null,
  currentTextBeingSpoken: string | null
): boolean => {
  if (!currentWord || !currentTextBeingSpoken) return false;
  
  // Extract the first part of the speech text (usually the word)
  const speechParts = currentTextBeingSpoken.split('.');
  if (speechParts.length === 0) return false;
  
  const firstPart = speechParts[0].toLowerCase().trim();
  const wordPart = currentWord.toLowerCase().trim().split(' ')[0]; // Get first word
  
  return firstPart.includes(wordPart);
};

// New function to ensure synchronization
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
