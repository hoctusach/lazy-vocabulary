
export const calculateSpeechDuration = (text: string, rate: number = 0.5): number => {
  // Average speaking rate is about 150 words per minute at normal speed (1.0)
  // We'll estimate 150 * rate words per minute
  const wordsPerMinute = 150 * rate;
  const words = text.split(' ').length;
  const minutes = words / wordsPerMinute;
  const milliseconds = minutes * 60 * 1000;
  
  // Add an even larger buffer for pauses and natural speech patterns (400% buffer)
  // This ensures we don't cut off words and gives plenty of time between words
  return milliseconds * 4.0;
};
