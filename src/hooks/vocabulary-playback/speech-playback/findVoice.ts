
import { VoiceSelection } from '../useVoiceSelection';

// Find most appropriate voice based on region and gender
export const findVoice = (voices: SpeechSynthesisVoice[], voiceSelection: VoiceSelection): SpeechSynthesisVoice | null => {
  console.log(`Finding ${voiceSelection.region} ${voiceSelection.gender} voice among ${voices.length} voices`);
  
  // Log first few voices for debugging
  voices.slice(0, 5).forEach((v, i) => {
    console.log(`Voice ${i}: ${v.name} (${v.lang})`);
  });
  
  const { region, gender } = voiceSelection;
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  const genderPattern = gender === 'female' ? /female|woman|girl|f$/i : /male|man|boy|m$/i;
  
  console.log(`Looking for ${region} ${gender} voice`);
  
  // First try to find exact match by language and gender pattern in name
  let voice = voices.find(v => 
    v.lang === langCode && 
    genderPattern.test(v.name)
  );
  
  if (voice) {
    console.log(`Found exact match: ${voice.name} ${voice.lang}`);
    return voice;
  }
  
  // Try by language only
  voice = voices.find(v => v.lang === langCode);
  if (voice) {
    console.log(`Found language match: ${voice.name} ${voice.lang}`);
    return voice;
  }
  
  // Try by region pattern in name and language prefix
  voice = voices.find(v => 
    v.lang.startsWith(langCode.split('-')[0]) &&
    (region === 'US' ? /us|united states|american/i : /uk|british|england|london/i).test(v.name)
  );
  
  if (voice) {
    console.log(`Found region name match: ${voice.name} ${voice.lang}`);
    return voice;
  }
  
  // Last resort - any voice with matching language prefix
  voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
  if (voice) {
    console.log(`Found language prefix match: ${voice.name} ${voice.lang}`);
    return voice;
  }
  
  // Absolute fallback - first voice in the list
  if (voices.length > 0) {
    console.log(`No matching voice found, using first available: ${voices[0].name}`);
    return voices[0];
  }
  
  console.log('No voices available at all');
  return null;
};
