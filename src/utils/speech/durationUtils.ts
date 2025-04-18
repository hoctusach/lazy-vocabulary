
export const calculateSpeechDuration = (text: string, rate: number = 1.0): number => {
  // More accurate duration calculation considering pauses
  const wordsPerMinute = 100 * rate; // Reduced words per minute for slower speech
  const words = text.split(' ').length;
  const minutes = words / wordsPerMinute;
  const baseMilliseconds = minutes * 60 * 1000;
  
  // Add buffer for natural speech patterns and pauses
  return baseMilliseconds * 3.0; // Increased buffer for slower speech
};
