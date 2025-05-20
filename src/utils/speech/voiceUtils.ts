
import { VoiceSelection } from "@/hooks/vocabulary-playback/useVoiceSelection";

// Hard-coded voice names based on previously working version
const US_VOICE_NAME = "Samantha"; // For US voice
const UK_VOICE_NAME = "Google UK English Female"; // For UK voice

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

// Simplified function to get voice by region using hardcoded voice names
export const getVoiceByRegion = (region: 'US' | 'UK', gender: 'male' | 'female' = 'female'): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  
  if (!voices || voices.length === 0) {
    console.warn('No voices available to select from');
    return null;
  }
  
  console.log(`Looking for ${region} voice with ${voices.length} voices available`);
  
  // Use the hardcoded voice names
  const targetVoiceName = region === 'US' ? US_VOICE_NAME : UK_VOICE_NAME;
  
  // First try: exact name match
  let voice = voices.find(v => v.name === targetVoiceName);
  
  if (voice) {
    console.log(`Found exact match for ${region} voice: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // If exact match fails, try partial name match
  voice = voices.find(v => v.name.includes(targetVoiceName));
  
  if (voice) {
    console.log(`Found partial match for ${region} voice: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Fallbacks based on language code if specific voices not found
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  voice = voices.find(v => v.lang === langCode);
  
  if (voice) {
    console.log(`Fallback to language code for ${region}: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Last resort - any English voice
  voice = voices.find(v => v.lang.startsWith('en'));
  
  if (voice) {
    console.log(`Last resort - any English voice: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Absolute fallback - first available voice
  if (voices.length > 0) {
    console.log(`No matching voice found, using first available: ${voices[0].name}`);
    return voices[0];
  }
  
  console.log('No voices available at all');
  return null;
};

export const getVoiceBySelection = (voiceSelection: VoiceSelection): SpeechSynthesisVoice | null => {
  return getVoiceByRegion(voiceSelection.region, voiceSelection.gender);
};
