import { clearUserCaches } from '@/lib/cleanup/clearUserCaches';
import { STORAGE_CONFIG } from '@/services/vocabulary/storage/StorageConfig';
import { WORD_COUNT_STORAGE_KEY } from '@/services/WordCountManager';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

const VOCABULARY_STORAGE_KEYS: readonly string[] = [
  STORAGE_CONFIG.STORAGE_KEY,
  STORAGE_CONFIG.LAST_UPLOADED_KEY,
  WORD_COUNT_STORAGE_KEY,
  BUTTON_STATES_KEY,
];

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function resetPlayerData(): void {
  clearUserCaches();

  if (typeof localStorage === 'undefined') return;

  const storage = localStorage;

  for (const key of VOCABULARY_STORAGE_KEYS) {
    safeRemove(storage, key);
  }
}
