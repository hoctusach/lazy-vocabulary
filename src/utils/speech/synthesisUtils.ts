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
  return normalizedText.includes(normalizedWord);
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis) {
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        setTimeout(() => {
          window.speechSynthesis.resume();
        }, 0);
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
