

// Enhanced voice loading with comprehensive monitoring
export const loadVoicesAndWait = async (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    let voicesLoaded = false;
    const startTime = Date.now();
    console.log('[ENGINE] === Voice Loading Process Started ===');
    
    // Try to get voices immediately
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      console.log('[ENGINE] ✓ Voices already available:', voices.length);
      voicesLoaded = true;
      resolve(voices);
      return;
    }
    
    console.log('[ENGINE] Waiting for voices to load via event listener');
    
    // Set up event listener for when voices change
    const voicesChangedHandler = () => {
      if (voicesLoaded) return; // Prevent multiple calls
      
      voices = window.speechSynthesis.getVoices();
      const elapsed = Date.now() - startTime;
      console.log(`[ENGINE] ✓ Voices loaded via event (${elapsed}ms):`, voices.length);
      
      if (voices.length > 0) {
        voicesLoaded = true;
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        resolve(voices);
      }
    };
    
    window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
    
    // Enhanced fallback with multiple checkpoints
    const checkpoints = [500, 1000, 1500, 2000, 3000];
    
    checkpoints.forEach((timeout, index) => {
      setTimeout(() => {
        if (!voicesLoaded) {
          voices = window.speechSynthesis.getVoices();
          const elapsed = Date.now() - startTime;
          console.log(`[ENGINE] Checkpoint ${index + 1} (${elapsed}ms): ${voices.length} voices`);
          
          // Resolve if we found voices or this is our final attempt
          if (voices.length > 0 || index === checkpoints.length - 1) {
            if (!voicesLoaded) {
              window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
              console.log(`[ENGINE] ✓ Voice loading complete (${elapsed}ms): ${voices.length} voices`);
              voicesLoaded = true;
              resolve(voices);
            }
          }
        }
      }, timeout);
    });
  });
};
