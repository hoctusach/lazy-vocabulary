/** [FB-58] The app speaks English only for now. */
export type ReminderLang = 'en';

const EN = [
  '2 minutes of words? Your sloth is waiting 🦥',
  'A few words, nice and slow. Your sloth saved you a spot 🦥',
  'Tiny study break? Two minutes is plenty 🌿',
  'Your words miss you. Come say hi 👋',
];

export const REMINDER_TITLE = 'Lazy Vocabulary';

export function reminderLines(lang: ReminderLang): string[] {
  void lang;
  return EN;
}

/** Deterministic rotation so re-planning doesn't reshuffle already-scheduled text. */
export function reminderBody(lang: ReminderLang, dayIndex: number, slot: number): string {
  const lines = reminderLines(lang);
  return lines[(dayIndex * 3 + slot) % lines.length];
}
