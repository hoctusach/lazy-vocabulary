
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
  
  // Use a more sophisticated voice matching algorithm
  
  // First priority: Match UK/US Female voice pattern
  if (region === 'UK') {
    let ukFemale = voices.find(v => /UK English Female|en-GB.*female/i.test(v.name));
    if (ukFemale) {
      console.log(`Selected UK Female voice: ${ukFemale.name} (${ukFemale.lang})`);
      return ukFemale;
    }
  } else if (region === 'US') {
    let usFemale = voices.find(v => /US English Female|en-US.*female/i.test(v.name));
    if (usFemale) {
      console.log(`Selected US Female voice: ${usFemale.name} (${usFemale.lang})`);
      return usFemale;
    }
  }
  
  // Second priority: Exact match for the language code
  let voice = voices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
  
  if (voice) {
    console.log(`Selected exact match voice for ${region}: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Third priority: Voice that starts with the language code
  voice = voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
  
  if (voice) {
    console.log(`Selected voice with prefix ${langCode}: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Fourth priority: Check for specific keywords in voice name
  // For US voices, look for US, American, or en-US in the name
  // For UK voices, look for UK, British, GB, or en-GB in the name
  const keywords = region === 'US' 
    ? ['us', 'american', 'united states', 'en-us'] 
    : ['uk', 'british', 'england', 'gb', 'en-gb'];
  
  voice = voices.find(v => {
    const name = v.name.toLowerCase();
    return keywords.some(keyword => name.includes(keyword));
  });
  
  if (voice) {
    console.log(`Selected voice by name keyword for ${region}: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Fifth priority: Google or Microsoft branded voices with appropriate region
  voice = voices.find(v => 
    (region === 'US' && (v.name.includes('Google US') || v.name.includes('Microsoft') && v.lang.startsWith('en'))) || 
    (region === 'UK' && (v.name.includes('Google UK') || v.name.includes('British')))
  );
  
  if (voice) {
    console.log(`Selected branded voice for ${region}: ${voice.name} (${voice.lang})`);
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
