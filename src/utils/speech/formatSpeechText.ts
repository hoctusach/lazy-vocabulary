export interface SpeechWord {
  word: string;
  meaning?: string;
  example?: string;
}

/**
 * Format vocabulary word fields into SSML text with 300ms pauses between
 * segments. This ensures consistent pauses across platforms.
 */
const sanitizeSegment = (segment: string): string => {
  return segment
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\/[^/]*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const formatSpeechText = ({ word, meaning = '', example = '' }: SpeechWord): string => {
  const parts = [word, meaning, example]
    .map((segment) => sanitizeSegment(segment ?? ''))
    .filter((segment) => segment.length > 0);

  return parts.join('<break time="300ms"/>');
};
