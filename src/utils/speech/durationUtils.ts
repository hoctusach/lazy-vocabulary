
export const calculateSpeechDuration = (text: string, rate: number = 1.0): number => {
  // Even more accurate duration calculation with better timing
  // Average reading rate is about 150 words per minute, but we reduce it for clarity
  const wordsPerMinute = 70 * rate; // Further reduced from 80 to 70 for even slower speaking rate
  
  // Count words more accurately
  const words = text.trim().split(/\s+/).length;
  
  // Calculate base duration in milliseconds
  const minutes = words / wordsPerMinute;
  const baseMilliseconds = minutes * 60 * 1000;
  
  // Count pauses and punctuation which require additional time
  const punctuationCount = (text.match(/[.,;:!?]/g) || []).length;
  const pauseTime = punctuationCount * 700; // Increased from 500ms to 700ms per punctuation mark
  
  // Add buffer for speech synthesis overhead and natural speaking rhythm
  // Further increase the buffer multiplier to prevent cutting off
  const bufferMultiplier = 4.5; // Increased from 4.0 to 4.5
  
  // Calculate final duration with all factors
  return (baseMilliseconds * bufferMultiplier) + pauseTime;
};
