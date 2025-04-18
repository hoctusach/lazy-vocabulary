
export const calculateSpeechDuration = (text: string, rate: number = 1.0): number => {
  // More accurate duration calculation considering pauses
  const wordsPerMinute = 150 * rate;
  const words = text.split(' ').length;
  const minutes = words / wordsPerMinute;
  const baseMilliseconds = minutes * 60 * 1000;
  
  // Add buffer for natural speech patterns and pauses
  return baseMilliseconds * 2.5; // Reduced buffer compared to previous version
};
