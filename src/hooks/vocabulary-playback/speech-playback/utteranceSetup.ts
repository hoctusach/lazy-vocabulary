
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { findVoice } from './findVoice';
import { sanitizeForDisplay } from '@/utils/security/contentSecurity';
import { getSpeechRate } from '@/utils/speech/core/speechSettings';
import parseWordAnnotations from '@/utils/text/parseWordAnnotations';


// Function to create and configure a speech utterance
export const createUtterance = (
  word: VocabularyWord,
  selectedVoice: VoiceSelection,
  voices: SpeechSynthesisVoice[],
  onEnd: () => void,
  onStart: () => void,
  onError: (e: SpeechSynthesisErrorEvent) => void
): SpeechSynthesisUtterance => {
  // Create a new utterance object
  const utterance = new SpeechSynthesisUtterance();
  
  try {
    // Sanitize input text for security
    const cleanedWord = parseWordAnnotations(word.word || '').main;
    const sanitizedWord = sanitizeForDisplay(cleanedWord);
    const sanitizedMeaning = sanitizeForDisplay(word.meaning || '');
    const sanitizedExample = sanitizeForDisplay(word.example || '');
    
    // Construct the text to speak with pauses
    let textToSpeak = formatSpeechText({
      word: sanitizedWord,
      meaning: sanitizedMeaning,
      example: sanitizedExample
    });
    
    // Additional sanitization for speech synthesis
    // Remove any remaining HTML entities and control characters
    textToSpeak = textToSpeak
      .replace(/&[#\w]+;/g, '') // Remove HTML entities
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim();
    
    // Limit text length for speech synthesis (some engines have limits)
    if (textToSpeak.length > 1000) {
      textToSpeak = textToSpeak.substring(0, 997) + '...';
      console.warn('Text truncated for speech synthesis due to length limit');
    }
    
    // Set the final text
    utterance.text = textToSpeak;
    
    // Find the appropriate voice
    const voice = findVoice(voices, selectedVoice);
    
    // Apply voice if found
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
      console.log(`Using voice: ${voice.name} (${voice.lang})`);
    } else {
      // Fallback language settings if no voice is found
      utterance.lang = selectedVoice.region === 'US' ? 'en-US' : 'en-GB';
      console.log(`No voice found, using default with language: ${utterance.lang}`);
    }
    
    // Configure speech properties
    utterance.rate = getSpeechRate();
    utterance.pitch = 1.0;  // Default pitch
    utterance.volume = 1.0; // Full volume
    
    // Register event handlers
    utterance.onend = (e) => {
      console.log('Speech ended successfully');
      if (onEnd) onEnd();
    };
    
    utterance.onstart = (e) => {
      console.log('Speech started successfully');
      if (onStart) onStart();
    };
    
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      if (onError) onError(e);
    };
    
  } catch (error) {
    console.error('Error creating utterance:', error);
  }
  
  return utterance;
};
