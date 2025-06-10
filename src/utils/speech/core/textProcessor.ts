
/**
 * Enhanced text processor for better speech timing and natural pauses
 */

export const formatTextForSpeech = (
  word: string, 
  meaning: string, 
  example: string,
  region: 'US' | 'UK' = 'US'
): string => {
  // Clean and prepare each section
  const cleanWord = word.trim();
  const cleanMeaning = meaning.trim();
  const cleanExample = example.trim();
  
  // Regional pause settings (in milliseconds for SSML)
  const pauseSettings = {
    US: {
      afterWord: 1000,      // 1 second after word
      afterMeaning: 800,    // 0.8 seconds after meaning
      betweenSentences: 600 // 0.6 seconds between sentences
    },
    UK: {
      afterWord: 1200,      // 1.2 seconds after word (UK voices are faster)
      afterMeaning: 1000,   // 1 second after meaning
      betweenSentences: 800 // 0.8 seconds between sentences
    }
  };
  
  const pauses = pauseSettings[region];
  
  // Build the speech text with natural pauses
  let speechText = '';
  
  // Add the word with emphasis and pause
  if (cleanWord) {
    speechText += `${cleanWord}`;
    speechText += `.`; // Period adds natural pause
    speechText += ` `; // Space for additional pause
  }
  
  // Add meaning with pause
  if (cleanMeaning) {
    speechText += `${cleanMeaning}`;
    speechText += `.`; // Period adds natural pause
    speechText += ` `; // Space for additional pause
  }
  
  // Add example
  if (cleanExample) {
    speechText += `${cleanExample}`;
    speechText += `.`; // Final period
  }
  
  return speechText.trim();
};

export const addNaturalPauses = (text: string): string => {
  // Add natural pauses after punctuation
  return text
    .replace(/\./g, '. ') // Add space after periods
    .replace(/,/g, ', ')  // Add space after commas
    .replace(/;/g, '; ')  // Add space after semicolons
    .replace(/:/g, ': ')  // Add space after colons
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();
};

export const estimateSpeechDuration = (text: string, rate: number = 0.75): number => {
  // Estimate duration based on word count and speech rate
  // Average: 150 words per minute at normal speed (1.0 rate)
  const wordCount = text.split(/\s+/).length;
  const baseWordsPerMinute = 150;
  const adjustedWordsPerMinute = baseWordsPerMinute * rate;
  const estimatedMinutes = wordCount / adjustedWordsPerMinute;
  const estimatedSeconds = estimatedMinutes * 60;
  
  // Add buffer time for pauses and processing
  return Math.ceil(estimatedSeconds + 2);
};
