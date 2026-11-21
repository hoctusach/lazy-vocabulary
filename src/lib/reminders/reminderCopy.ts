export type ReminderLang = 'en' | 'vi';

const EN = [
  '2 minutes of words? Your sloth is waiting 🦥',
  'A few words, nice and slow. Your sloth saved you a spot 🦥',
  'Tiny study break? Two minutes is plenty 🌿',
  'Your words miss you. Come say hi 👋',
];

const VI = [
  'Học 2 phút từ vựng nhé? Bé lười đang đợi 🦥',
  'Vài từ thôi, thong thả nha. Bé lười giữ chỗ cho bạn rồi 🦥',
  'Nghỉ chút rồi học vài từ nhé? 2 phút là đủ 🌿',
  'Từ vựng nhớ bạn đó, ghé chút nha 👋',
];

export const REMINDER_TITLE = 'Lazy Vocabulary';

export function reminderLines(lang: ReminderLang): string[] {
  return lang === 'vi' ? VI : EN;
}

/** Deterministic rotation so re-planning doesn't reshuffle already-scheduled text. */
export function reminderBody(lang: ReminderLang, dayIndex: number, slot: number): string {
  const lines = reminderLines(lang);
  return lines[(dayIndex * 3 + slot) % lines.length];
}
