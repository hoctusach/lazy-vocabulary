
import { VoiceSelection } from '../useVoiceSelection';

// Hard-coded voice names based on previously working version
const US_VOICE_NAME = "en-US-Standard-G"; // For US voice
const UK_VOICE_NAME = "Google UK English Female"; // For UK voice

// Backup voice names in case primary ones aren't found
const BACKUP_US_VOICES = ["Google US English", "Microsoft David", "Alex"];
const BACKUP_UK_VOICES = ["Microsoft Susan", "Daniel", "Kate"];

// Simplified voice finding function using hardcoded voice names and better fallbacks
export const findVoice = (voices: SpeechSynthesisVoice[], voiceSelection: VoiceSelection): SpeechSynthesisVoice | null => {
  console.log(`Finding ${voiceSelection.region} voice among ${voices.length} voices`);
  
  if (voices.length === 0) {
    console.log('No voices available at all');
    return null;
  }
  
  // Log first few voices for debugging
  voices.slice(0, 5).forEach((v, i) => {
    console.log(`Voice ${i}: ${v.name} (${v.lang})`);
  });
  
  const { region } = voiceSelection;
  const targetVoiceName = region === 'US' ? US_VOICE_NAME : UK_VOICE_NAME;
  const backupVoices = region === 'US' ? BACKUP_US_VOICES : BACKUP_UK_VOICES;
  
  console.log(`Looking for ${region} voice with name: ${targetVoiceName}`);
  
  // First try: exact name match
  let voice = voices.find(v => v.name === targetVoiceName);
  
  if (voice) {
    console.log(`Found exact match: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Second try: partial name match
  voice = voices.find(v => v.name.includes(targetVoiceName));
  
  if (voice) {
    console.log(`Found partial match: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Third try: check for backup voice options
  for (const backupName of backupVoices) {
    voice = voices.find(v => v.name === backupName || v.name.includes(backupName));
    if (voice) {
      console.log(`Found backup voice: ${voice.name} (${voice.lang})`);
      return voice;
    }
  }
  
  // Fallback to language code
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  voice = voices.find(v => v.lang === langCode);
  
  if (voice) {
    console.log(`Fallback to language code: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Last resort - any English voice
  voice = voices.find(v => v.lang.startsWith('en'));
  
  if (voice) {
    console.log(`Last resort - any English voice: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Absolute fallback - first voice in the list
  if (voices.length > 0) {
    console.log(`No suitable voice found, using first available: ${voices[0].name}`);
    return voices[0];
  }
  
  return null;
};
