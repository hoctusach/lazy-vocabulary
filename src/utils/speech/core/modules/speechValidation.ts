
export const ensureSpeechEngineReady = async (): Promise<void> => {
  if (window.speechSynthesis) {
    console.log('[ENGINE] Preparing speech engine');

    // Only cancel if something is actually speaking
    if (window.speechSynthesis.speaking) {
      console.log('[ENGINE] Canceling existing speech');
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 150)); // Reduced wait time
    }
    
    console.log('[ENGINE] Speech engine prepared');
  }
};
