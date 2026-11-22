// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SRS_TIP_STORAGE_KEY, buildSrsTip, dismissForToday, isDismissedToday, localDateKey, monthsToFinish,
} from '../srsTip';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('[FB-11] buildSrsTip', () => {
  it('English intro copy with plan line', () => {
    const t = buildSrsTip({ isVietnamese: false, total: 3000, due: 0 });
    expect(t.kind).toBe('intro');
    expect(t.title).toBe('20 words a day. Never forget them.');
    expect(t.body).toBe("Lazy Vocabulary brings each word back right before you'd forget it: 2, 3, 5, 7… then every 60 days.");
    expect(t.line).toBe('20 words/day → all 3000 words in ~5 months.');
  });
  it('Vietnamese intro copy', () => {
    const t = buildSrsTip({ isVietnamese: true, total: 3000, due: 0 });
    expect(t.title).toBe('Mỗi ngày 20 từ. Nhớ mãi không quên.');
    expect(t.body).toBe('App nhắc lại từng từ đúng lúc bạn sắp quên: sau 2, 3, 5, 7 ngày… rồi 60 ngày một lần.');
    expect(t.line).toBe('20 từ/ngày → thuộc hết 3000 từ trong ~5 tháng.');
  });
  it('rounds months', () => {
    expect(monthsToFinish(3000)).toBe(5);
    expect(monthsToFinish(900)).toBe(2); // 1.5 -> 2
    expect(monthsToFinish(840)).toBe(1); // 1.4 -> 1
  });
  it('hides the plan line below 100 words', () => {
    expect(buildSrsTip({ isVietnamese: false, total: 99, due: 0 }).line).toBeUndefined();
    expect(buildSrsTip({ isVietnamese: false, total: 100, due: 0 }).line).toBeDefined();
  });
  it('due > 0 replaces everything', () => {
    const en = buildSrsTip({ isVietnamese: false, total: 3000, due: 7 });
    expect(en).toEqual({ kind: 'due', title: '7 words are about to slip away. 3 minutes to save them.' });
    expect(buildSrsTip({ isVietnamese: true, total: 3000, due: 7 }).title).toBe('7 từ sắp bị quên. 3 phút để giữ lại.');
  });
});

describe('once-a-day dismissal', () => {
  it('shown by default, hidden after dismiss, shown next day', () => {
    const today = new Date(2026, 10, 16, 9);
    expect(isDismissedToday(today)).toBe(false);
    dismissForToday(today);
    expect(localStorage.getItem(SRS_TIP_STORAGE_KEY)).toBe('2026-11-16');
    expect(isDismissedToday(new Date(2026, 10, 16, 23, 59))).toBe(true);
    expect(isDismissedToday(new Date(2026, 10, 17, 0, 1))).toBe(false);
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('[FB-22] survives broken localStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(isDismissedToday()).toBe(false);
    expect(() => dismissForToday()).not.toThrow();
  });
});
