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
    // d with stroke has no decomposition, so map it by hand (đường -> duong).
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default normalizeQuery;
