import { LAST_TODAY_WORD_KEY, LAST_WORD_KEY } from '@/utils/lastWordStorage';
import {
  DAILY_SELECTION_KEY,
  LAST_SELECTION_DATE_KEY,
  LAST_SYNC_DATE_KEY,
  LEARNED_WORDS_CACHE_KEY,
  LEARNING_PROGRESS_KEY,
  TODAY_WORDS_KEY,
} from '@/utils/storageKeys';

const STATIC_KEYS: readonly string[] = [
  LEARNING_PROGRESS_KEY,
  DAILY_SELECTION_KEY,
  LAST_SELECTION_DATE_KEY,
  TODAY_WORDS_KEY,
  LAST_SYNC_DATE_KEY,
  LEARNED_WORDS_CACHE_KEY,
  LAST_WORD_KEY,
  LAST_TODAY_WORD_KEY,
  'progressSummary',
  'currentDisplayedWord',
];

const PREFIXES: readonly string[] = [
  'dailyTime_',
  'learningTime_',
];

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function clearUserCaches(): void {
  if (typeof localStorage === 'undefined') return;

  for (const key of STATIC_KEYS) {
    safeRemove(key);
  }

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      safeRemove(key);
    }
  } catch {
    /* ignore */
  }
}
