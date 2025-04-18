
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
    console.warn('No voices available to select from');
    return null;
  }
  
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  
  console.log(`Searching for voice with region=${region}, langCode=${langCode} among ${voices.length} voices`);
  
  // Log all available voices for debugging
  voices.forEach((v, i) => {
    console.log(`Voice ${i+1}: name="${v.name}", lang="${v.lang}"`);
  });
  
  // First try to find a premium voice
  let voice = voices.find(v => 
    v.lang === langCode && (v.name.includes('Google') || v.name.includes('Microsoft'))
  );
  
  if (voice) {
    console.log(`Selected premium voice: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // If no premium voice found, try any voice for that region
  voice = voices.find(v => v.lang === langCode);
  
  if (voice) {
    console.log(`Selected standard voice for ${region}: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Fallback to any English voice if not found
  voice = voices.find(v => v.lang.startsWith('en'));
  
  if (voice) {
    console.log(`Selected fallback English voice: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Last resort - use any voice
  if (voices.length > 0) {
    voice = voices[0];
    console.log(`Selected last resort voice: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  console.warn(`No suitable voice found for ${region}`);
  return null;
};
