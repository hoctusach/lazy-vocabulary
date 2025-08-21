/**
 * Normalize search query by trimming, removing annotations and diacritics,
 * and whitelisting allowed characters.
 */
import parseWordAnnotations from './parseWordAnnotations';

export const normalizeQuery = (input: string): string => {
  if (!input) return '';
  const { main } = parseWordAnnotations(input);
  return main
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default normalizeQuery;
