import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { LearningProgressService } from '@/services/learningProgressService';
import type { VocabularyWord } from '@/types/vocabulary';
import type { LearningProgress } from '@/types/learning';
import * as learnedDb from '@/lib/db/learned';
import type { LearnedWordUpsert } from '@/lib/db/learned';

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
  let getLearnedSpy: MockInstance<
    Parameters<typeof learnedDb.getLearned>,
    ReturnType<typeof learnedDb.getLearned>
  >;
  let upsertLearnedSpy: MockInstance<
    Parameters<typeof learnedDb.upsertLearned>,
    ReturnType<typeof learnedDb.upsertLearned>
  >;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
      writable: true
    });

    service = LearningProgressService.getInstance();
    getLearnedSpy = vi.spyOn(learnedDb, 'getLearned').mockResolvedValue([]);
    upsertLearnedSpy = vi.spyOn(learnedDb, 'upsertLearned').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('caches Supabase due words for the current day', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    getLearnedSpy.mockResolvedValue([
      { word_id: 'fruit::apple', in_review_queue: true, next_review_at: yesterday },
      { word_id: 'fruit::apple', in_review_queue: true, next_review_at: yesterday },
      { word_id: 'fruit::banana', in_review_queue: true, next_review_at: tomorrow },
      { word_id: 'fruit::cherry', in_review_queue: true, next_display_at: yesterday },
      { word_id: 'fruit::date', in_review_queue: true, next_display_at: tomorrow },
      { word_id: 'fruit::elderberry', in_review_queue: false, next_review_at: yesterday }
    ]);

    const result = await service.syncServerDueWords();
    expect(result).toEqual(['fruit::apple', 'fruit::cherry']);
    expect(getLearnedSpy).toHaveBeenCalledTimes(1);

    const storedWords = localStorage.getItem('todayWords');
    expect(storedWords).toBe(JSON.stringify(['fruit::apple', 'fruit::cherry']));
    expect(localStorage.getItem('lastSyncDate')).toBe(today);

    getLearnedSpy.mockClear();
    const secondResult = await service.syncServerDueWords();
    expect(secondResult).toEqual(['fruit::apple', 'fruit::cherry']);
    expect(getLearnedSpy).not.toHaveBeenCalled();
  });

  it('includes cached server due words in the review selection', async () => {
    getLearnedSpy.mockResolvedValue([
      {
        word_id: 'fruit::apple',
        in_review_queue: true,
        next_review_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]);

    await service.syncServerDueWords();

    const words: VocabularyWord[] = [
      { word: 'apple', meaning: '', example: '', category: 'fruit', count: 1 },
      { word: 'banana', meaning: '', example: '', category: 'fruit', count: 1 }
    ];

    const selection = service.forceGenerateDailySelection(words, 'light');
    expect(selection.reviewWords.map(w => w.word)).toContain('apple');
    expect(selection.newWords.some(w => w.word === 'apple')).toBe(false);
  });

  it('keeps due metadata intact when a selection is generated without reviewing', async () => {
    vi.useFakeTimers();

    try {
      const now = new Date('2024-05-20T12:00:00.000Z');
      vi.setSystemTime(now);

      const dueDateKey = '2024-05-20';
      const dueDateIso = '2024-05-20T00:00:00.000Z';
      const lastReviewIso = '2024-05-18T00:00:00.000Z';

      getLearnedSpy.mockResolvedValue([
        {
          word_id: 'fruit::apple',
          in_review_queue: true,
          review_count: 5,
          last_review_at: lastReviewIso,
          next_review_at: dueDateIso,
          next_display_at: dueDateIso,
          last_seen_at: lastReviewIso,
          srs_interval_days: 3,
          srs_state: 'review'
        }
      ] as unknown as Awaited<ReturnType<typeof learnedDb.getLearned>>);

      const storedProgress: Record<string, Partial<LearningProgress>> = {
        'apple::fruit': {
          word: 'apple',
          category: 'fruit',
          isLearned: true,
          reviewCount: 5,
          lastPlayedDate: lastReviewIso,
          status: 'due',
          nextReviewDate: dueDateKey,
          createdDate: '2024-05-01',
          learnedDate: '2024-05-01T00:00:00.000Z',
          nextAllowedTime: dueDateIso
        }
      };

      localStorage.setItem('learningProgress', JSON.stringify(storedProgress));

      const payloads: LearnedWordUpsert[] = [];
      let resolveUpsert: (() => void) | null = null;
      const upsertDone = new Promise<void>(resolve => {
        resolveUpsert = resolve;
      });

      upsertLearnedSpy.mockImplementation(async (_wordId, payload) => {
        payloads.push(payload);
        if (resolveUpsert) {
          resolveUpsert();
          resolveUpsert = null;
        }
      });

      const words: VocabularyWord[] = [
        { word: 'apple', meaning: '', example: '', category: 'fruit', count: 1 }
      ];

      const selection = service.forceGenerateDailySelection(words, 'light');
      expect(selection.reviewWords.map(w => w.word)).toContain('apple');

      await upsertDone;

      expect(payloads).toHaveLength(1);
      const payload = payloads[0];
      expect(payload.review_count).toBe(5);
      expect(payload.last_review_at).toBe(lastReviewIso);
      expect(payload.next_review_at).toBe(dueDateIso);
      expect(payload.next_display_at).toBe(dueDateIso);
      expect(payload.in_review_queue).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
