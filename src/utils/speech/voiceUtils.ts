
export const findFallbackVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) {
    return null;
  }
  
  // Try to find any English voice first
  const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
  if (englishVoice) {
    return englishVoice;
  }
  
  // If no English voice is available, return the first available voice
  return voices[0];
};

export const getVoiceByRegion = (region: 'US' | 'UK'): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  
  if (!voices || voices.length === 0) {
    return null;
  }
  
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  
  // First try to find a premium voice
  let voice = voices.find(v => 
    v.lang === langCode && (v.name.includes('Google') || v.name.includes('Microsoft'))
  );
  
  // If no premium voice found, try any voice for that region
  if (!voice) {
    voice = voices.find(v => v.lang === langCode);
  }
  
  // Fallback to any English voice if not found
  if (!voice) {
    voice = voices.find(v => v.lang.startsWith('en'));
  }
  
  // Last resort - use any voice
  if (!voice && voices.length > 0) {
    voice = voices[0];
  }
  
  console.log(`Selected voice for ${region}:`, voice ? `${voice.name} (${voice.lang})` : "None found");
  return voice;
};

