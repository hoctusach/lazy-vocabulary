export const MAX_SLOTS = 3;
export const SETTINGS_KEY = 'lazyVoca.reminders.v1';

export type ReminderSlot = { on: boolean; time: string };
export type ReminderSettings = {
  enabled: boolean;
  slots: ReminderSlot[];
  /** The one automatic permission prompt has been used; never auto-ask again. */
  autoAsked: boolean;
};

export const DEFAULT_SLOTS: ReminderSlot[] = [
  { on: true, time: '08:00' },
  { on: true, time: '12:30' },
  { on: true, time: '20:30' },
];

export function defaultSettings(): ReminderSettings {
  return { enabled: false, slots: DEFAULT_SLOTS.map((s) => ({ ...s })), autoAsked: false };
}

export function isValidTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export function normaliseSettings(raw: unknown): ReminderSettings {
  const base = defaultSettings();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ReminderSettings>;
  const slots = base.slots.map((d, i) => {
    const s = Array.isArray(r.slots) ? (r.slots[i] as Partial<ReminderSlot> | undefined) : undefined;
    return { on: typeof s?.on === 'boolean' ? s.on : d.on, time: isValidTime(s?.time) ? s!.time! : d.time };
  });
  return { enabled: r.enabled === true, slots, autoAsked: r.autoAsked === true };
}

export function loadSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return normaliseSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: ReminderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore storage failures
  }
}
