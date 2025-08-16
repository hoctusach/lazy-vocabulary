import { getLocalDateISO } from '@/utils/date';

export const LAST_WORD_KEY = 'lazyVoca.lastWordByCategory';
export const LAST_TODAY_WORD_KEY = 'lazyVoca.todayLastWord';

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

interface TodayLastWordRecord {
  date: string;
  word: string;
  category?: string;
}

export const getTodayLastWord = (): { word: string; category?: string } | undefined => {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const stored = localStorage.getItem(LAST_TODAY_WORD_KEY);
    if (!stored) return undefined;
    const data = JSON.parse(stored) as TodayLastWordRecord;
    if (data.date === getLocalDateISO()) {
      return { word: data.word, category: data.category };
    }
  } catch (error) {
    console.error('Error reading today\'s last word from localStorage:', error);
  }
  try {
    localStorage.removeItem(LAST_TODAY_WORD_KEY);
  } catch {}
  return undefined;
};

export const saveTodayLastWord = (word: string, category?: string): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    const record: TodayLastWordRecord = {
      date: getLocalDateISO(),
      word,
      category
    };
    localStorage.setItem(LAST_TODAY_WORD_KEY, JSON.stringify(record));
  } catch (error) {
    console.error('Error saving today\'s last word to localStorage:', error);
  }
};
