
export const calculateSpeechDuration = (text: string, rate: number = 1.0): number => {
  // More accurate duration calculation with better timing
  // Average reading rate is about 150 words per minute, but we reduce it for clarity
  const wordsPerMinute = 80 * rate; // Reduced from 100 to 80 for slower speaking rate
  
  // Count words more accurately
  const words = text.trim().split(/\s+/).length;
  
  // Calculate base duration in milliseconds
  const minutes = words / wordsPerMinute;
  const baseMilliseconds = minutes * 60 * 1000;
  
  // Count pauses and punctuation which require additional time
  const punctuationCount = (text.match(/[.,;:!?]/g) || []).length;
  const pauseTime = punctuationCount * 500; // Increased from 300ms to 500ms per punctuation mark
  
  // Add buffer for speech synthesis overhead and natural speaking rhythm
  // Increase the buffer multiplier to prevent cutting off
  const bufferMultiplier = 4.0; // Increased from 3.5 to 4.0
  
  // Calculate final duration with all factors
  return (baseMilliseconds * bufferMultiplier) + pauseTime;
};
