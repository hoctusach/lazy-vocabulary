export const LAST_WORD_KEY = 'lazyVoca.lastWordByCategory';

export const getLastWords = (): Record<string, string> => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const stored = localStorage.getItem(LAST_WORD_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
  } catch (error) {
    console.error('Error reading last words from localStorage:', error);
  }
  try {
    localStorage.removeItem(LAST_WORD_KEY);
  } catch {}
  return {};
};

export const getLastWord = (category: string): string | undefined => {
  const map = getLastWords();
  return map[category];
};

export const saveLastWord = (category: string, word: string): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    const map = getLastWords();
    map[category] = word;
    localStorage.setItem(LAST_WORD_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error saving last word to localStorage:', error);
  }
};
