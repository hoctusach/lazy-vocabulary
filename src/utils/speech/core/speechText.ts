


export const extractMainWord = (word: string): string => {
  return word.split(/\s*\(/)[0].trim();
};

export const cleanSpeechText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove slash-delimited segments such as IPA transcriptions
    .replace(/\/[^/]*\//g, ' ')
    // Remove parenthetical content
    .replace(/\([^)]*\)/g, ' ')
    // Remove square bracket annotations
    .replace(/\[[^\]]*\]/g, ' ')
    // Remove numbering like "1." even when embedded in a sentence
    .replace(/\b\d+\.\s*/g, '')
    // Normalise spacing and punctuation gaps
    .replace(/\s+([,;:.!?])/g, '$1')
    .replace(/([,;:.!?])\s+/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const prepareTextForSpeech = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  console.log('[SPEECH-TEXT] Original text:', text.substring(0, 50) + '...');

  const prepared = cleanSpeechText(text);

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
