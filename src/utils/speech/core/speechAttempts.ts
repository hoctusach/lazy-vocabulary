
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
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    window.speechSynthesis.speak(utterance);
    
    await new Promise<void>((resolveStart, rejectStart) => {
      setTimeout(() => {
        if (window.speechSynthesis.speaking) {
          resolveStart();
        } else if (attempts < 4) {
          console.warn(`Speech did not start, retrying`);
          rejectStart(new Error('Speech not started'));
        } else {
          // On last attempt, just proceed even if speech isn't detected
          console.warn('Final attempt: proceeding even though speech may not have started');
          resolveStart();
        }
      }, 600);
    });
  } catch (error) {
    console.error('Speech start error:', error);
    await new Promise(resolve => setTimeout(resolve, 500));
    return attemptSpeech(utterance, attempts + 1);
  }
};
