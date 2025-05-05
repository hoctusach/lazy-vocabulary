
export const extractMainWord = (word: string): string => {
  return word.split(/\s*\(/)[0].trim();
};

export const prepareTextForSpeech = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
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
