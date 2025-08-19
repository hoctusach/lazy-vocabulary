import { describe, it, expect, beforeEach } from 'vitest';
import { VocabularySheetOperations } from '@/services/vocabulary/VocabularySheetOperations';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

const createOps = (sheetOptions: string[]) => {
  const mockManager = {
    getData: () => ({}),
    notifyVocabularyChange: () => {}
  } as any;
  return new VocabularySheetOperations(mockManager, sheetOptions);
};

// Simple in-memory localStorage mock
const createLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  } as Storage;
};

describe('VocabularySheetOperations initial sheet', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', { value: createLocalStorage(), writable: true });
  });

  it('restores category from localStorage when available', () => {
    localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify({ currentCategory: 'idioms' }));
    const ops = createOps(['idioms', 'phrasal verbs']);
    expect(ops.getCurrentSheetName()).toBe('idioms');
  });

  it('falls back to first sheet option when no stored category exists', () => {
    const ops = createOps(['idioms', 'phrasal verbs']);
    expect(ops.getCurrentSheetName()).toBe('idioms');
  });
});
