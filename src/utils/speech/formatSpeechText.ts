export interface SpeechWord {
  word: string;
  meaning?: string;
  example?: string;
}

/**
 * Format vocabulary word fields into SSML text with 300ms pauses between
 * segments. This ensures consistent pauses across platforms.
 */
export const formatSpeechText = ({ word, meaning = '', example = '' }: SpeechWord): string => {
  const parts = [word.trim()];
  if (meaning && meaning.trim().length > 0) {
    parts.push(meaning.trim());
  }
  if (example && example.trim().length > 0) {
    parts.push(example.trim());
  }
  return parts.filter(Boolean).join('<break time="300ms"/>');
};
