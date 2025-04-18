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

// Enhanced function to check if sound and display are in sync
export const checkSoundDisplaySync = (
  currentWord: string | null, 
  currentTextBeingSpoken: string | null
): boolean => {
  if (!currentWord || !currentTextBeingSpoken) return true;
  
  // More robust check to handle different text formats
  const normalizedWord = currentWord.toLowerCase().trim();
  const normalizedText = currentTextBeingSpoken.toLowerCase().trim();
  
  // Check if the current word is included in the text being spoken
  return normalizedText.includes(normalizedWord);
};

// Keep speech synthesis alive with regular pings
export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }
};

// Wait until speech synthesis is really ready
export const waitForSpeechReadiness = (): Promise<void> => {
  return new Promise(resolve => {
    // This short delay helps ensure speech synthesis is ready
    setTimeout(resolve, 50);
  });
};
