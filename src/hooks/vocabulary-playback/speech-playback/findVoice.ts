
import { VoiceSelection } from '../useVoiceSelection';


// Backup voice names in case primary ones aren't found
// Backup voice names in case primary voices aren't found. These remain as
// additional fallbacks but will only be used if no matching language code
// voices are available.
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
  const langCode = region === 'US' ? 'en-US' : region === 'UK' ? 'en-GB' : 'en-AU';

  console.log(`Looking for voice with language code: ${langCode}`);

  // First try: exact language code match
  let voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langCode.toLowerCase()));

  if (voice) {
    console.log(`Found language match: ${voice.name} (${voice.lang})`);
    return voice;
  }

  // Attempt using backup voice lists for US/UK regions
  const backupVoices = region === 'US' ? BACKUP_US_VOICES : BACKUP_UK_VOICES;
  for (const backupName of backupVoices) {
    voice = voices.find(v => v.name === backupName || v.name.includes(backupName));
    if (voice) {
      console.log(`Found backup voice: ${voice.name} (${voice.lang})`);
      return voice;
    }
  }

  // Fallback to any English voice
  voice = voices.find(v => v.lang && v.lang.startsWith('en'));
  
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
