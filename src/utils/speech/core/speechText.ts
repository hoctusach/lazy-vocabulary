


export const extractMainWord = (word: string): string => {
  return word.split(/\s*\(/)[0].trim();
};

export const cleanSpeechText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  const linesWithBreaks = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.replace(/\b(\d+)\.\s*/g, (_match, num: string) => `Number ${num}: `)
    )
    .join('. ');

  const cleaned = linesWithBreaks
    // Remove slash-delimited segments such as IPA transcriptions
    .replace(/\/[^/]*\//g, ' ')
    // Remove parenthetical content
    .replace(/\([^)]*\)/g, ' ')
    // Remove square bracket annotations
    .replace(/\[[^\]]*\]/g, ' ')
    // Normalise spacing and punctuation gaps
    .replace(/\s+([,;:.!?])/g, '$1')
    .replace(/([,;:.!?])\s+/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
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
