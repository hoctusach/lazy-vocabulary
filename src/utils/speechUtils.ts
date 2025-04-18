
// Initialize and verify speech synthesis support
export const initializeSpeechSynthesis = (): SpeechSynthesis => {
  if (!window.speechSynthesis) {
    console.error("Speech synthesis not supported in this browser");
  }
  return window.speechSynthesis;
};

// Find a fallback voice if the primary selection fails
export const findFallbackVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  // Try to find common English voices available in most browsers
  const commonVoices = ['Google US English', 'Samantha', 'Microsoft David', 'Alex', 'Google UK English Female'];
  
  for (const voiceName of commonVoices) {
    const voice = voices.find(v => v.name.includes(voiceName));
    if (voice) {
      console.log(`Using fallback voice: ${voice.name}`);
      return voice;
    }
  }
  
  // If no common voice found, just get any English voice
  const anyEnglishVoice = voices.find(v => v.lang.startsWith('en'));
  if (anyEnglishVoice) {
    console.log(`Using fallback voice: ${anyEnglishVoice.name}`);
    return anyEnglishVoice;
  }
  
  // Last resort: use the first available voice
  if (voices.length > 0) {
    console.log(`Using first available voice: ${voices[0].name}`);
    return voices[0];
  }
  
  return null;
};

export const createUtterance = (
  text: string,
  voice: SpeechSynthesisVoice | null,
  fallbackVoices: SpeechSynthesisVoice[] = []
): SpeechSynthesisUtterance => {
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set voice properties
  if (voice) {
    utterance.voice = voice;
    console.log(`Using voice: ${voice.name}`);
  } else if (fallbackVoices.length > 0) {
    // Try a fallback voice if primary voice is null
    const fallbackVoice = findFallbackVoice(fallbackVoices);
    if (fallbackVoice) {
      utterance.voice = fallbackVoice;
    }
  }
  
  // These settings help with reliability
  utterance.rate = 0.9; // Slightly slower for better clarity
  utterance.pitch = 1.0;
  utterance.volume = 1.0; // Maximum volume
  
  return utterance;
};

export const cancelSpeech = () => {
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    
    // Some browsers need a short pause after cancel
    setTimeout(() => {
      // Resume in case the synthesis was paused
      if (synth.paused) {
        synth.resume();
      }
    }, 50);
  } catch (error) {
    console.error("Error cancelling speech:", error);
  }
};

// Force the speechSynthesis to be reset (fixes issues in some browsers)
export const resetSpeechSynthesis = () => {
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    
    // Chrome/Edge sometimes gets stuck - this helps unstick it
    if (synth.speaking || synth.pending || synth.paused) {
      synth.pause();
      setTimeout(() => {
        synth.resume();
      }, 100);
    }
  } catch (error) {
    console.error("Error resetting speech synthesis:", error);
  }
};

// Force speech to work in Chrome/Edge by handling page visibility changes
export const handleVisibilityChange = () => {
  if (document.hidden) {
    // Page is hidden, cancel any ongoing speech
    cancelSpeech();
  } else {
    // Page is visible again, reset speech synthesis
    resetSpeechSynthesis();
  }
};
