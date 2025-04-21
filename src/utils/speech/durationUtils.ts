
export const calculateSpeechDuration = (text: string, rate = 1.0): number => {
  const wordsPerMinute = 150 * rate;      // bump from 70 to 150
  const minutes = text.trim().split(/\s+/).length / wordsPerMinute;
  const baseMs = minutes * 60_000;
  return baseMs + 500;                    // small fixed buffer
};
