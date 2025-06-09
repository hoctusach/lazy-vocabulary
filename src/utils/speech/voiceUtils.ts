import { VoiceSelection } from "@/hooks/vocabulary-playback/useVoiceSelection";

// Updated voice names with better UK options
const US_VOICE_NAME = "Samantha"; // For US voice
const UK_VOICE_NAMES = [
  "Google UK English Female", // Primary option
  "Daniel", // Backup UK voice
  "Kate", // Another backup
  "Susan", // Microsoft UK voice
  "Hazel" // Additional UK option
];

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

// Enhanced function to get voice by region with better UK voice selection
export const getVoiceByRegion = (region: 'US' | 'UK', gender: 'male' | 'female' = 'female'): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  
  if (!voices || voices.length === 0) {
    console.warn('No voices available to select from');
    return null;
  }
  
  console.log(`Looking for ${region} voice with ${voices.length} voices available`);
  
  if (region === 'US') {
    // US voice logic (unchanged)
    let voice = voices.find(v => v.name === US_VOICE_NAME);
    
    if (voice) {
      console.log(`Found exact US voice: ${voice.name} (${voice.lang})`);
      return voice;
    }
    
    // Fallback to language code
    voice = voices.find(v => v.lang === 'en-US');
    
    if (voice) {
      console.log(`Fallback US voice by language: ${voice.name} (${voice.lang})`);
      return voice;
    }
  } else {
    // Enhanced UK voice selection
    console.log('Searching for UK voice with enhanced selection...');
    
    // Try each UK voice name in order of preference
    for (const ukVoiceName of UK_VOICE_NAMES) {
      let voice = voices.find(v => v.name === ukVoiceName);
      
      if (voice) {
        console.log(`Found exact UK voice match: ${voice.name} (${voice.lang})`);
        return voice;
      }
      
      // Try partial match
      voice = voices.find(v => v.name.includes(ukVoiceName));
      
      if (voice) {
        console.log(`Found partial UK voice match: ${voice.name} (${voice.lang})`);
        return voice;
      }
    }
    
    // Try by language code with gender preference
    let voice = voices.find(v => 
      v.lang === 'en-GB' && 
      (gender === 'female' ? !v.name.toLowerCase().includes('male') : v.name.toLowerCase().includes('male'))
    );
    
    if (voice) {
      console.log(`Found UK voice by language and gender: ${voice.name} (${voice.lang})`);
      return voice;
    }
    
    // Fallback to any en-GB voice
    voice = voices.find(v => v.lang === 'en-GB');
    
    if (voice) {
      console.log(`Fallback UK voice by language: ${voice.name} (${voice.lang})`);
      return voice;
    }
    
    // Try finding voices with UK indicators in the name
    const ukIndicators = ['UK', 'British', 'GB', 'English'];
    for (const indicator of ukIndicators) {
      voice = voices.find(v => 
        v.name.includes(indicator) && 
        v.lang.startsWith('en')
      );
      
      if (voice) {
        console.log(`Found UK voice by indicator "${indicator}": ${voice.name} (${voice.lang})`);
        return voice;
      }
    }
  }
  
  // Last resort - any English voice
  const voice = voices.find(v => v.lang.startsWith('en'));
  
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

export const hasAvailableVoices = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }
    return window.speechSynthesis.getVoices().length > 0;
  } catch {
    return false;
  }
};
