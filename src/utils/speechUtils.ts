
export const initializeSpeechSynthesis = (): SpeechSynthesis => {
  return window.speechSynthesis;
};

export const createUtterance = (
  text: string,
  voice: SpeechSynthesisVoice | null
): SpeechSynthesisUtterance => {
  const utterance = new SpeechSynthesisUtterance(text);
  
  if (voice) {
    utterance.voice = voice;
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;
  }
  
  return utterance;
};

export const cancelSpeech = () => {
  window.speechSynthesis.cancel();
};
