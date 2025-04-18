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
  
  const normalizedWord = currentWord.toLowerCase().trim();
  const normalizedText = currentTextBeingSpoken.toLowerCase().trim();
  
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
      setTimeout(() => {
        window.speechSynthesis.resume();
      }, 50);
    } catch (error) {
      console.error('Error resetting speech engine:', error);
    }
  }
};

export const validateCurrentSpeech = (
  currentWord: string | null,
  currentTextBeingSpoken: string | null
): boolean => {
  if (!currentWord || !currentTextBeingSpoken) return false;
  
  const mainWord = currentWord.split('(')[0].trim().toLowerCase();
  
  const spokenText = currentTextBeingSpoken.toLowerCase().trim();
  
  return spokenText.includes(mainWord);
};

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

export const ensureSpeechEngineReady = async (): Promise<boolean> => {
  if (!window.speechSynthesis) return false;
  
  try {
    window.speechSynthesis.cancel();
    await new Promise(resolve => setTimeout(resolve, 150));
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
    return true;
  } catch (error) {
    console.error('Error ensuring speech engine is ready:', error);
    return false;
  }
};

export const extractMainWord = (wordText: string): string => {
  return wordText.split('(')[0].trim().toLowerCase();
};

export const getSpeechRate = (): number => {
  return 0.72;
};

export const getSpeechPitch = (): number => {
  return 1.0;
};

export const prepareTextForSpeech = (text: string): string => {
  return text.replace(/\.\s+/g, '. ').replace(/\s{2,}/g, ' ').trim();
};

export const getSpeechVolume = (): number => {
  return 1.0;
};

export const addPausesToText = (text: string): string => {
  return text
    .replace(/\./g, '. ')
    .replace(/;/g, '; ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};
