/**
 * Normalize search query by trimming, removing diacritics,
 * and whitelisting allowed characters.
 */
export const normalizeQuery = (input: string): string => {
  if (!input) return '';
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export default normalizeQuery;
