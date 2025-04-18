
export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    console.log('Speech stopped');
  }
};

