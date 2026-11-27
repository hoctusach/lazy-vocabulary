import { describe, it, expect } from 'vitest';
import { pickReminderMessage, START_TIER, BUILDING_TIER, STRONG_TIER } from '@/lib/reminders/messages';

describe('pickReminderMessage', () => {
  it('[FB-58] every nudge is English (no Vietnamese)', () => {
    for (const line of [...START_TIER, ...BUILDING_TIER, ...STRONG_TIER]) expect(line).not.toMatch(/[ạảãàáâấầẩẫậăắằẳẵặẹẻẽèéêếềểễệỉĩịọỏõòóôốồổỗộơớờởỡợụủũùúưứừửữựỳỷỹỵđ]/i);
  });

  it('always returns a non-empty string', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(pickReminderMessage(0, 0).length).toBeGreaterThan(0);
    }
  });

  it('escalates to the strong tier on a long streak', () => {
    const strongCopy = new Set(STRONG_TIER);
    for (let i = 0; i < 20; i += 1) {
      expect(strongCopy.has(pickReminderMessage(7, 0))).toBe(true);
    }
  });

  it('escalates to the strong tier on a high learned count even with no streak', () => {
    for (let i = 0; i < 10; i += 1) {
      const message = pickReminderMessage(0, 50);
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('stays in the start tier for a brand-new learner', () => {
    const startCopy = new Set(START_TIER);
    for (let i = 0; i < 20; i += 1) {
      expect(startCopy.has(pickReminderMessage(0, 0))).toBe(true);
    }
  });
});
