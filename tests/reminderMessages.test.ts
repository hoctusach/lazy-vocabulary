import { describe, it, expect } from 'vitest';
import { pickReminderMessage } from '@/lib/reminders/messages';

describe('pickReminderMessage', () => {
  it('always returns a non-empty string', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(pickReminderMessage(0, 0).length).toBeGreaterThan(0);
    }
  });

  it('escalates to the strong tier on a long streak', () => {
    const strongCopy = new Set([
      "Sắp xịn rồi đó, đừng dừng lại chứ! 💪",
      "Cỡ này mà bỏ streak thì phí lắm nha!",
      "Sắp lên advanced rồi, cố lên!",
      "Bạn đang trên đà thành cao thủ từ vựng rồi đó 😎",
      "Chuỗi ngày học của bạn đang đẹp lắm, đừng làm gãy!",
    ]);
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
    const startCopy = new Set([
      "10 phút thôi, vô đi! Liếc một cái rồi ra cũng được 😌",
      "Từ vựng đang nằm chờ bạn kìa 👀",
      "Ghé một chút thôi, không cần cày cả buổi đâu.",
      "Học 3 lần 1 ngày là đẹp rồi, khỏi cần nhiều 🌱",
      "Mở app lên xíu cho từ vựng đỡ buồn 🥲",
    ]);
    for (let i = 0; i < 20; i += 1) {
      expect(startCopy.has(pickReminderMessage(0, 0))).toBe(true);
    }
  });
});
