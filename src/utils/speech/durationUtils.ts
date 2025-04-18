
export const calculateSpeechDuration = (text: string, rate: number = 0.85): number => {
  // Average speaking rate is about 150 words per minute at normal speed (1.0)
  // We'll estimate 150 * rate words per minute
  const wordsPerMinute = 150 * rate;
  const words = text.split(' ').length;
  const minutes = words / wordsPerMinute;
  const milliseconds = minutes * 60 * 1000;
  
  // Add a larger buffer for pauses and natural speech patterns (250% buffer)
  return milliseconds * 2.5;
};

