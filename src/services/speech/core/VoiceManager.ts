
/**
 * Manages voice selection and text formatting for speech
 */
import { formatSpeechText } from '@/utils/speech';

export class VoiceManager {
  // Create formatted speech text with SSML pauses
  createSpeechText(word: { word: string; meaning: string; example: string }): string {
    const cleanText = (text: string) => text.trim().replace(/\s+/g, ' ');

    const wordText = cleanText(word.word);
    const meaningText = cleanText(word.meaning);
    const exampleText = cleanText(word.example);

    return formatSpeechText({ word: wordText, meaning: meaningText, example: exampleText });
  }

  // Find voice by region
  findVoice(region: 'US' | 'UK' | 'AU'): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis?.getVoices() || [];
    
    const regionMap = {
      'US': ['en-US', 'en_US'],
      'UK': ['en-GB', 'en_GB'], 
      'AU': ['en-AU', 'en_AU']
    };

    const langCodes = regionMap[region];
    return voices.find(voice => 
      langCodes.some(code => voice.lang.includes(code))
    ) || voices.find(voice => voice.lang.startsWith('en')) || null;
  }
}
