
export const getSpeechRate = (): number => {
  // Set speech rate to 1.0 as requested
  return 1.0;
};

export const addPausesToText = (text: string): string => {
  // Add more strategic pauses to improve comprehension
  return text
    .replace(/\./g, '... ') // Longer pause after period
    .replace(/;/g, '... ') // Longer pause after semicolon
    .replace(/,/g, ' ') // Slight pause after comma
    .replace(/\?/g, '... ') // Longer pause after question mark
    .replace(/!/g, '... ') // Longer pause after exclamation
    .replace(/:/g, '... ') // Pause after colon
    .replace(/\s{2,}/g, ' ')
    .trim();
};
