import { beforeEach, describe, expect, it } from 'vitest';
import { LearningProgressService } from '@/services/learningProgressService';
import type { VocabularyWord } from '@/types/vocabulary';
import type { LearningProgress } from '@/types/learning';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    }
  } as Storage;
}

describe('LearningProgressService daily selection persistence', () => {
  let service: LearningProgressService;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
      writable: true
    });

    service = LearningProgressService.getInstance();
  });

  it('generates a daily selection and stores it under the current date key', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const storedProgress: Record<string, Partial<LearningProgress>> = {
      'apple::fruit': {
        word: 'apple',
        category: 'fruit',
        isLearned: true,
        reviewCount: 2,
        lastPlayedDate: yesterday,
        status: 'due',
        nextReviewDate: yesterday,
        createdDate: yesterday
      },
      'banana::fruit': {
        word: 'banana',
        category: 'fruit',
        isLearned: true,
        reviewCount: 1,
        lastPlayedDate: yesterday,
        status: 'not_due',
        nextReviewDate: tomorrow,
        createdDate: yesterday
      }
    };

    localStorage.setItem('learningProgress', JSON.stringify(storedProgress));

    const words: VocabularyWord[] = [
      { word: 'apple', meaning: '', example: '', category: 'fruit', count: 1 },
      { word: 'banana', meaning: '', example: '', category: 'fruit', count: 1 },
      { word: 'carrot', meaning: '', example: '', category: 'vegetable', count: 1 }
    ];

    const selection = service.forceGenerateDailySelection(words, 'light');

    expect(selection.severity).toBe('light');
    expect(selection.reviewWords.map(p => p.word)).toContain('apple');
    expect(selection.newWords.map(p => p.word)).toContain('carrot');
    expect(selection.totalCount).toBe(selection.newWords.length + selection.reviewWords.length);

    const storedRaw = localStorage.getItem(`dailySelection:${today}`);
    expect(storedRaw).not.toBeNull();
    const storedSelection = JSON.parse(storedRaw!);
    expect(storedSelection).toMatchObject({
      severity: 'light',
      totalCount: selection.totalCount
    });

    const cached = service.getTodaySelection();
    expect(cached).toEqual(selection);
  });

  it('returns null when there is no cached selection for today', () => {
    localStorage.clear();
    expect(service.getTodaySelection()).toBeNull();
  });
});
