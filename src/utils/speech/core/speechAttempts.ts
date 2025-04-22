
export const attemptSpeech = async (
  utterance: SpeechSynthesisUtterance,
  attempts: number = 0
): Promise<void> => {
  if (attempts >= 5) {
    console.error('Failed to start speech after multiple attempts');
    throw new Error('Failed to start speech');
  }
  
  try {
    if (attempts > 0) {
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    window.speechSynthesis.speak(utterance);
    
    await new Promise<void>((resolveStart, rejectStart) => {
      setTimeout(() => {
        if (window.speechSynthesis.speaking) {
          resolveStart();
        } else {
          console.warn(`Speech failed to start, retry attempt ${attempts + 1}`);
          rejectStart(new Error('Speech not started'));
        }
      }, 900);
    });
  } catch (error) {
    console.error('Speech start error:', error);
    await new Promise(resolve => setTimeout(resolve, 800));
    return attemptSpeech(utterance, attempts + 1);
  }
};

