
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
  
  // Important: Use the exact language code for the requested region
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  
  console.log(`Searching for voice with region=${region}, langCode=${langCode} among ${voices.length} voices`);
  
  // Log all available voices for debugging
  if (voices.length > 0) {
    console.log(`Available voices: ${voices.length}`);
    voices.forEach((v, i) => {
      console.log(`Voice ${i+1}: name="${v.name}", lang="${v.lang}"`);
    });
  }
  
  // First try to find an exact match for the region
  let voice = voices.find(v => v.lang === langCode);
  
  if (voice) {
    console.log(`Selected exact match voice for ${region}: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // If no exact match, try to find a voice with the appropriate language prefix
  const langPrefix = region === 'US' ? 'en-US' : 'en-GB';
  voice = voices.find(v => v.lang.startsWith(langPrefix));
  
  if (voice) {
    console.log(`Selected voice with prefix ${langPrefix}: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Fallback to premium voices that might have the right accent
  voice = voices.find(v => 
    (region === 'US' && v.name.includes('Google US')) || 
    (region === 'UK' && v.name.includes('Google UK'))
  );
  
  if (voice) {
    console.log(`Selected premium voice for ${region}: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Fallback to any English voice if specific region not found
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
