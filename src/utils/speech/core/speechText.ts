


export const extractMainWord = (word: string): string => {
  return word.split(/\s*\(/)[0].trim();
};

const cleanForSpeech = (text: string): string => {
  return text
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\/.*?\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const prepareTextForSpeech = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  console.log('[SPEECH-TEXT] Original text:', text.substring(0, 50) + '...');

  const prepared = cleanForSpeech(text);

  console.log('[SPEECH-TEXT] Prepared for speech:', prepared.substring(0, 50) + '...');
  console.log('[SPEECH-TEXT] Length reduction:', text.length, '->', prepared.length);

  return prepared;
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
