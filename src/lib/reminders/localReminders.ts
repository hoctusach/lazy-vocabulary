import { Capacitor } from '@capacitor/core';
import { planReminders } from './reminderPlanner';
import { loadSettings, saveSettings, type ReminderSettings } from './reminderSettings';
import { hasStudiedToday } from './studySignal';
import type { ReminderLang } from './reminderCopy';

/** The slice of @capacitor/local-notifications we use (also what tests/e2e mock). */
export interface ReminderPlugin {
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  getPending(): Promise<{ notifications: { id: number; extra?: unknown }[] }>;
  cancel(opts: { notifications: { id: number }[] }): Promise<void>;
  schedule(opts: { notifications: Record<string, unknown>[] }): Promise<unknown>;
  addListener?(event: string, cb: (e: { notification?: { extra?: { lvReminder?: boolean } } }) => void): Promise<unknown> | unknown;
}

export const SMALL_ICON = 'ic_stat_notify';
export const OPEN_LEARN_EVENT = 'lv:open-learn';

declare global {
  interface Window {
    /** Test hook: a mock plugin (e2e) used instead of the native one. */
    __LV_LOCAL_NOTIFICATIONS__?: ReminderPlugin;
  }
}

let cached: Promise<ReminderPlugin | null> | null = null;

/** The native plugin, an injected mock, or null (web: reminders are a no-op). */
export function getReminderPlugin(): Promise<ReminderPlugin | null> {
  if (typeof window !== 'undefined' && window.__LV_LOCAL_NOTIFICATIONS__) {
    return Promise.resolve(window.__LV_LOCAL_NOTIFICATIONS__);
  }
  if (!Capacitor.isNativePlatform()) return Promise.resolve(null);
  cached ??= import('@capacitor/local-notifications')
    // Wrap in a plain object: resolving a promise with the Capacitor proxy itself would
    // probe `.then` on it and throw "not implemented".
    .then((m): ReminderPlugin => {
      const ln = m.LocalNotifications;
      return {
        checkPermissions: () => ln.checkPermissions(),
        requestPermissions: () => ln.requestPermissions(),
        getPending: () => ln.getPending(),
        cancel: (o) => ln.cancel(o),
        schedule: (o) => ln.schedule(o as never),
        addListener: (e, cb) => ln.addListener(e as 'localNotificationActionPerformed', cb as never),
      };
    })
    .catch(() => null);
  return cached;
}

export function currentLang(): ReminderLang {
  return 'en';
}

export type PermissionResult = 'granted' | 'denied';

/** Ask for notification permission (only prompts when the OS state is still "prompt"). */
export async function ensurePermission(plugin: ReminderPlugin): Promise<PermissionResult> {
  try {
    const cur = await plugin.checkPermissions();
    if (cur.display === 'granted') return 'granted';
    if (cur.display === 'denied') return 'denied';
    const res = await plugin.requestPermissions();
    return res.display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Cancel our pending reminders and schedule a fresh 7-day plan. Inexact + allowWhileIdle,
 * so no SCHEDULE_EXACT_ALARM. Safe to call often; calls are serialised.
 */
export async function replanReminders(
  plugin: ReminderPlugin,
  settings: ReminderSettings,
  now: Date,
  studiedToday: boolean,
  lang: ReminderLang,
): Promise<number> {
  try {
    const pending = await plugin.getPending();
    const ours = (pending.notifications ?? []).filter(
      (n) => (n.extra as { lvReminder?: boolean } | undefined)?.lvReminder,
    );
    if (ours.length) await plugin.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

    if (!settings.enabled) return 0;
    if ((await plugin.checkPermissions()).display !== 'granted') return 0;

    const plan = planReminders(settings, now, studiedToday, lang);
    if (plan.length === 0) return 0;
    await plugin.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        smallIcon: SMALL_ICON,
        schedule: { at: p.at, allowWhileIdle: true },
        extra: { lvReminder: true, route: 'learn' },
      })),
    });
    return plan.length;
  } catch (e) {
    console.warn('[reminders] replan failed', e);
    return 0;
  }
}

let chain: Promise<unknown> = Promise.resolve();

/** Re-plan from stored settings + current time/study state. No-op without a plugin. */
export function replanNow(): Promise<number> {
  const run = async () => {
    const plugin = await getReminderPlugin();
    if (!plugin) return 0;
    return replanReminders(plugin, loadSettings(), new Date(), hasStudiedToday(), currentLang());
  };
  const next = chain.then(run, run);
  chain = next.catch(() => undefined);
  return next;
}

/** Toggle from the UI. Turning on asks for permission; denied keeps it off. */
export async function setRemindersEnabled(on: boolean): Promise<PermissionResult | 'off'> {
  const plugin = await getReminderPlugin();
  const s = loadSettings();
  if (!on || !plugin) {
    saveSettings({ ...s, enabled: false });
    await replanNow();
    return 'off';
  }
  const perm = await ensurePermission(plugin);
  saveSettings({ ...s, enabled: perm === 'granted', autoAsked: s.autoAsked || perm === 'denied' });
  await replanNow();
  return perm;
}

/**
 * After the first real study action (mark / quiz answer), ask once — and only once ever —
 * for permission and switch reminders on if granted. Never on launch.
 */
export async function maybeAutoAsk(): Promise<void> {
  const plugin = await getReminderPlugin();
  const s = loadSettings();
  if (!plugin || s.autoAsked || s.enabled) return;
  saveSettings({ ...s, autoAsked: true });
  const perm = await ensurePermission(plugin);
  if (perm === 'granted') saveSettings({ ...loadSettings(), enabled: true });
  await replanNow();
}

let listening = false;
/** Tapping a reminder opens Learn. */
export async function listenForTaps(): Promise<void> {
  if (listening) return;
  const plugin = await getReminderPlugin();
  if (!plugin?.addListener) return;
  listening = true;
  try {
    await plugin.addListener('localNotificationActionPerformed', (e) => {
      if (e?.notification?.extra?.lvReminder) window.dispatchEvent(new Event(OPEN_LEARN_EVENT));
    });
  } catch {
    listening = false;
  }
}
