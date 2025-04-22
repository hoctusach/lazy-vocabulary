
export const extractMainWord = (word: string): string => {
  return word.split(/\s*\(/)[0].trim();
};

export const prepareTextForSpeech = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
};

export const addPausesToText = (text: string): string => {
  return text.replace(/\./g, '. <break time="500ms"/> ');
};

export const checkSoundDisplaySync = (displayedWord: string, spokenText: string): boolean => {
  return spokenText.toLowerCase().includes(displayedWord.toLowerCase());
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

