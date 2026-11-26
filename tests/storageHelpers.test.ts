/**
 * @vitest-environment jsdom
 * Local persistence helpers (K1, K3, K4, K5, I7, D16).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-10T10:00:00Z'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('last word per category and today last word (K3)', () => {
  it('saves and reads a last word per category', async () => {
    const { saveLastWord, getLastWord } = await import('@/utils/lastWordStorage');
    saveLastWord('idioms', 'spare');
    saveLastWord('grammar', 'if');
    expect(getLastWord('idioms')).toBe('spare');
    expect(getLastWord('grammar')).toBe('if');
    expect(getLastWord('none')).toBeUndefined();
  });

  it('ignores and removes corrupt data', async () => {
    const { getLastWords, LAST_WORD_KEY } = await import('@/utils/lastWordStorage');
    localStorage.setItem(LAST_WORD_KEY, '{not json');
    expect(getLastWords()).toEqual({});
    expect(localStorage.getItem(LAST_WORD_KEY)).toBeNull();
  });

  it('today last word is valid only on the same day', async () => {
    const { saveTodayLastWord, getTodayLastWord, LAST_TODAY_WORD_KEY } = await import('@/utils/lastWordStorage');
    saveTodayLastWord(3, 'spare', 'idioms');
    expect(getTodayLastWord()).toMatchObject({ index: 3, word: 'spare', category: 'idioms' });
    vi.setSystemTime(new Date('2026-03-11T10:00:00Z'));
    expect(getTodayLastWord()).toBeUndefined();
    expect(localStorage.getItem(LAST_TODAY_WORD_KEY)).toBeNull();
  });

  it('survives a storage that throws', async () => {
    const { saveLastWord, saveTodayLastWord } = await import('@/utils/lastWordStorage');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveLastWord('a', 'b')).not.toThrow();
    expect(() => saveTodayLastWord(1, 'b')).not.toThrow();
  });
});

describe('word counts (K4)', () => {
  it('counts per lowercase word and category', async () => {
    const { wordCountManager } = await import('@/services/WordCountManager');
    const a = { word: 'Spare', meaning: '', example: '', count: 0, category: 'idioms' };
    const b = { ...a, word: 'spare' };
    wordCountManager.incrementCount(a);
    wordCountManager.incrementCount(b);
    expect(wordCountManager.getCount(a)).toBe(2);
    expect(wordCountManager.getCount({ ...a, category: 'grammar' })).toBe(0);
    expect(wordCountManager.getCount({ ...a, category: undefined })).toBe(0);
  });

  it('sorts by lowest count, then by oldest last shown, never-shown first', async () => {
    const { wordCountManager } = await import('@/services/WordCountManager');
    const mk = (word: string) => ({ word, meaning: '', example: '', count: 0, category: 'x' });
    wordCountManager.incrementCount(mk('b'));
    vi.setSystemTime(new Date('2026-03-10T10:05:00Z'));
    wordCountManager.incrementCount(mk('a'));
    wordCountManager.incrementCount(mk('c'));
    wordCountManager.incrementCount(mk('c'));
    expect(wordCountManager.sortWordsByPriority([mk('c'), mk('a'), mk('b'), mk('new')]).map((x) => x.word)).toEqual(['new', 'b', 'a', 'c']);
  });

  it('starts empty when the saved data is corrupt', async () => {
    localStorage.setItem('vocabulary-word-counts', '{bad');
    const { wordCountManager } = await import('@/services/WordCountManager');
    expect(wordCountManager.getCount({ word: 'x', meaning: '', example: '', count: 0 })).toBe(0);
  });

  it('restores saved data across a reload', async () => {
    let mod = await import('@/services/WordCountManager');
    mod.wordCountManager.incrementCount({ word: 'x', meaning: '', example: '', count: 0 });
    vi.resetModules();
    mod = await import('@/services/WordCountManager');
    expect(mod.wordCountManager.getCount({ word: 'x', meaning: '', example: '', count: 0 })).toBe(1);
  });
});

describe('learning time (K5)', () => {
  it('adds the time of a session to the day', async () => {
    const { learningTimeService } = await import('@/services/learningTimeService');
    learningTimeService.startSession('u');
    vi.advanceTimersByTime(30 * 60_000);
    expect(learningTimeService.stopSession('u')).toBe(30 * 60_000);
    expect(learningTimeService.getTotalHours('u')).toBeCloseTo(0.5, 5);
  });

  it('a second start does not reset the first, and stop without start is 0', async () => {
    const { learningTimeService } = await import('@/services/learningTimeService');
    expect(learningTimeService.stopSession('nobody')).toBe(0);
    learningTimeService.startSession('u');
    vi.advanceTimersByTime(60_000);
    learningTimeService.startSession('u');
    vi.advanceTimersByTime(60_000);
    expect(learningTimeService.stopSession('u')).toBe(120_000);
  });

  it('keeps learners apart', async () => {
    const { learningTimeService } = await import('@/services/learningTimeService');
    learningTimeService.startSession('a');
    vi.advanceTimersByTime(60_000);
    learningTimeService.stopSession('a');
    expect(learningTimeService.getTotalHours('b')).toBe(0);
  });

  it('a session over midnight is booked on the day it ends (local day)', async () => {
    const { learningTimeService } = await import('@/services/learningTimeService');
    vi.setSystemTime(new Date('2026-03-10T23:50:00Z'));
    learningTimeService.startSession('u');
    vi.setSystemTime(new Date('2026-03-11T00:10:00Z'));
    learningTimeService.stopSession('u');
    expect(JSON.parse(localStorage.getItem('learningTime_u')!)).toEqual({ '2026-03-11': 20 * 60_000 });
  });

  it('never adds negative time when the clock goes backwards', async () => {
    const { learningTimeService } = await import('@/services/learningTimeService');
    learningTimeService.startSession('u');
    vi.setSystemTime(new Date('2026-03-10T09:00:00Z'));
    expect(learningTimeService.stopSession('u')).toBeGreaterThanOrEqual(0);
  });

  it('books the time on the local day in Vietnam (UTC+7), not the UTC day', async () => {
    const original = process.env.TZ;
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    try {
      const { learningTimeService } = await import('@/services/learningTimeService');
      vi.setSystemTime(new Date('2026-03-10T17:10:00Z')); // 00:10 on the 11th in Vietnam
      learningTimeService.startSession('u');
      vi.advanceTimersByTime(5 * 60_000);
      learningTimeService.stopSession('u');
      expect(Object.keys(JSON.parse(localStorage.getItem('learningTime_u')!))).toEqual(['2026-03-11']);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('ignores corrupt stored data', async () => {
    localStorage.setItem('learningTime_u', '{bad');
    const { learningTimeService } = await import('@/services/learningTimeService');
    expect(learningTimeService.getTotalHours('u')).toBe(0);
  });
});

describe('preferences (K1)', () => {
  it('returns defaults when nothing is stored or the data is corrupt', async () => {
    const { readPreferencesFromStorage } = await import('@/lib/preferences/localPreferences');
    expect(readPreferencesFromStorage()).toMatchObject({ is_muted: false, is_playing: true, favorite_voice: null });
    localStorage.setItem('lv_preferences', '{bad');
    expect(readPreferencesFromStorage()).toMatchObject({ is_muted: false });
  });

  it('merges partial saves without losing other fields', async () => {
    const { writePreferencesToStorage, readPreferencesFromStorage } = await import('@/lib/preferences/localPreferences');
    writePreferencesToStorage({ is_muted: true });
    writePreferencesToStorage({ speech_rate: 1.2 });
    expect(readPreferencesFromStorage()).toMatchObject({ is_muted: true, speech_rate: 1.2 });
  });

  // Known risk: a stored null replaces the default, so is_muted can come back as null instead of a boolean.
  it.fails('mute and playing flags are always booleans', async () => {
    localStorage.setItem('lv_preferences', JSON.stringify({ is_muted: null, is_playing: null }));
    const { readPreferencesFromStorage } = await import('@/lib/preferences/localPreferences');
    const prefs = readPreferencesFromStorage();
    expect(typeof prefs.is_muted).toBe('boolean');
    expect(typeof prefs.is_playing).toBe('boolean');
  });
});

describe('quiz done once per day (I7)', () => {
  it('is false until completed, true after, false the next day', async () => {
    const { hasCompletedQuizToday, markQuizCompletedToday } = await import('@/features/quiz/quizService');
    expect(hasCompletedQuizToday()).toBe(false);
    markQuizCompletedToday();
    expect(hasCompletedQuizToday()).toBe(true);
    vi.setSystemTime(new Date('2026-03-11T10:00:00Z'));
    expect(hasCompletedQuizToday()).toBe(false);
  });

  it('does not crash when storage is blocked', async () => {
    const { hasCompletedQuizToday, markQuizCompletedToday } = await import('@/features/quiz/quizService');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasCompletedQuizToday()).toBe(false);
    expect(() => markQuizCompletedToday()).not.toThrow();
  });
});

describe('friend share link (D15, D16)', () => {
  it('builds a link with only the friend parameter', async () => {
    window.history.pushState({}, '', '/app?a=1&friend=old#x');
    const { buildFriendShareUrl } = await import('@/lib/progress/friendCompare');
    const url = new URL(buildFriendShareUrl('tok en'));
    expect(url.searchParams.get('friend')).toBe('tok en');
    expect(url.searchParams.has('a')).toBe(false);
    expect(url.hash).toBe('');
  });

  it('reads the friend key and ignores empty values', async () => {
    const { readFriendKeyFromLocation } = await import('@/lib/progress/friendCompare');
    window.history.pushState({}, '', '/?friend=abc123');
    expect(readFriendKeyFromLocation()).toBe('abc123');
    window.history.pushState({}, '', '/?friend=%20%20');
    expect(readFriendKeyFromLocation()).toBeNull();
    window.history.pushState({}, '', '/');
    expect(readFriendKeyFromLocation()).toBeNull();
  });
});
