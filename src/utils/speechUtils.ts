
export const initializeSpeechSynthesis = (): SpeechSynthesis => {
  return window.speechSynthesis;
};

// Find a fallback voice if the primary selection fails
export const findFallbackVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  // Try to find common English voices available in most browsers
  const commonVoices = ['Google US English', 'Samantha', 'Microsoft David', 'Alex'];
  
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
  
  if (voice) {
    utterance.voice = voice;
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0; // Maximum volume
  } else if (fallbackVoices.length > 0) {
    // Try a fallback voice if primary voice is null
    const fallbackVoice = findFallbackVoice(fallbackVoices);
    if (fallbackVoice) {
      utterance.voice = fallbackVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
    }
  }
  
  return utterance;
};

export const cancelSpeech = () => {
  try {
    window.speechSynthesis.cancel();
    // Some browsers need a short pause after cancel
    setTimeout(() => {
      // Resume in case the synthesis was paused
      window.speechSynthesis.resume();
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
    if (synth.speaking || synth.pending) {
      synth.pause();
      setTimeout(() => {
        synth.resume();
      }, 100);
    }
  } catch (error) {
    console.error("Error resetting speech synthesis:", error);
  }
};

