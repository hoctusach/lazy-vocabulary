
import { extractSpeechableContent } from '../../text/contentFilters';

export const extractMainWord = (word: string): string => {
  return word.split(/\s*\(/)[0].trim();
};

export const prepareTextForSpeech = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  console.log('[SPEECH-TEXT] Original text:', text.substring(0, 50) + '...');
  
  // First extract speechable content (removes IPA and Vietnamese)
  const speechableText = extractSpeechableContent(text);
  
  // Then apply standard text preparation
  const prepared = speechableText.replace(/\s+/g, ' ').trim();
  
  console.log('[SPEECH-TEXT] Prepared for speech:', prepared.substring(0, 50) + '...');
  console.log('[SPEECH-TEXT] Length reduction:', text.length, '->', prepared.length);
  
  return prepared;
};

export const addPausesToText = (text: string): string => {
  // Replace XML break tags with actual SSML pause marks that won't be read aloud
  return text.replace(/\./g, '.');
};

export const checkSoundDisplaySync = (text: string, spokenText: string): boolean => {
  return spokenText.toLowerCase().includes(text.toLowerCase());
};

export const forceResyncIfNeeded = (
  currentWord: string, 
  processedText: string, 
  resyncCallback: () => void
): void => {
  if (!processedText.toLowerCase().includes(currentWord.toLowerCase())) {
    console.log(`Speech-display sync issue detected. Resyncing...`);
    resyncCallback();
  }
};
