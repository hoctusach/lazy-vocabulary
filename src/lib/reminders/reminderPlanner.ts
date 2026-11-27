import { MAX_SLOTS, isValidTime, type ReminderSettings } from './reminderSettings';
import { REMINDER_TITLE, reminderBody, type ReminderLang } from './reminderCopy';

export const PLAN_DAYS = 7;

export type PlannedReminder = {
  id: number;
  at: Date;
  title: string;
  body: string;
  slot: number;
};

/** Stable int32 id from date + slot: YYMMDD * 10 + slot, e.g. 2611212. */
export function reminderId(day: Date, slot: number): number {
  return ((day.getFullYear() % 100) * 10000 + (day.getMonth() + 1) * 100 + day.getDate()) * 10 + slot;
}

/**
 * Explicit one-off reminders for the next PLAN_DAYS days. Today's are skipped once the user
 * has studied; past times today are dropped; at most MAX_SLOTS per day. Pure.
 */
export function planReminders(
  settings: ReminderSettings,
  now: Date,
  studiedToday: boolean,
  lang: ReminderLang,
): PlannedReminder[] {
  if (!settings.enabled) return [];
  const out: PlannedReminder[] = [];
  const slots = settings.slots.slice(0, MAX_SLOTS);
  for (let d = 0; d < PLAN_DAYS; d += 1) {
    if (d === 0 && studiedToday) continue;
    slots.forEach((slot, i) => {
      if (!slot.on || !isValidTime(slot.time)) return;
      const [h, m] = slot.time.split(':').map(Number);
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, m, 0, 0);
      if (at.getTime() <= now.getTime()) return;
      out.push({ id: reminderId(at, i), at, title: REMINDER_TITLE, body: reminderBody(lang, d, i), slot: i });
    });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

