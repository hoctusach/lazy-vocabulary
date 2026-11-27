/**
 * Normalize search query by trimming, removing annotations and diacritics,
 * and keeping letters and digits of any script (Latin, Vietnamese, CJK, Thai, Arabic...).
 */
import parseWordAnnotations from './parseWordAnnotations';

export const normalizeQuery = (input: string): string => {
  if (!input) return '';
  const { main } = parseWordAnnotations(input);
  return main
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // Vietnamese d with stroke (U+0111 / U+0110) has no decomposition, so map it by hand (duong with a stroke -> duong).
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default normalizeQuery;
