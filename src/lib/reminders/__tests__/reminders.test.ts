// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { planReminders, reminderId } from '../reminderPlanner';
import { defaultSettings, loadSettings, saveSettings, type ReminderSettings } from '../reminderSettings';
import { hasStudiedToday, markStudiedToday } from '../studySignal';
import { reminderLines } from '../reminderCopy';
import {
  ensurePermission, maybeAutoAsk, replanNow, replanReminders, setRemindersEnabled, type ReminderPlugin,
} from '../localReminders';

const on = (): ReminderSettings => ({ ...defaultSettings(), enabled: true });
const at = (h: number, m = 0) => new Date(2026, 10, 21, h, m, 0, 0); // Sat 21 Nov 2026

function mockPlugin(display = 'granted', pending: { id: number; extra?: unknown }[] = []) {
  const state = { display, pending: [...pending] };
  const p = {
    checkPermissions: vi.fn(async () => ({ display: state.display })),
    requestPermissions: vi.fn(async () => { if (state.display === 'prompt') state.display = 'granted'; return { display: state.display }; }),
    getPending: vi.fn(async () => ({ notifications: state.pending })),
    cancel: vi.fn(async (o: { notifications: { id: number }[] }) => { state.pending = state.pending.filter((n) => !o.notifications.some((c) => c.id === n.id)); }),
    schedule: vi.fn(async (o: { notifications: Record<string, unknown>[] }) => { state.pending.push(...o.notifications.map((n) => ({ id: n.id as number, extra: n.extra }))); }),
  };
  return { p: p as unknown as ReminderPlugin & typeof p, state };
}

beforeEach(() => { localStorage.clear(); delete window.__LV_LOCAL_NOTIFICATIONS__; });

describe('planReminders', () => {
  it('[FB-07] plans 3 slots a day for 7 days at the default times', () => {
    const plan = planReminders(on(), at(6), false, 'en');
    expect(plan).toHaveLength(21);
    expect(plan.slice(0, 3).map((r) => `${r.at.getHours()}:${r.at.getMinutes()}`)).toEqual(['8:0', '12:30', '20:30']);
    expect(new Set(plan.map((r) => r.id)).size).toBe(21);
  });
  it('drops times already past today', () => {
    const plan = planReminders(on(), at(13), false, 'en');
    expect(plan.filter((r) => r.at.getDate() === 21)).toHaveLength(1);
    expect(plan).toHaveLength(19);
  });
  it('[FB-07] never exceeds 3 per day even if settings carry more slots', () => {
    const s = on();
    s.slots = [...s.slots, { on: true, time: '10:00' }, { on: true, time: '11:00' }];
    const perDay = planReminders(s, at(6), false, 'en').filter((r) => r.at.getDate() === 22);
    expect(perDay).toHaveLength(3);
  });
  it('[FB-07] skips only today once studied; tomorrow onward stays', () => {
    const plan = planReminders(on(), at(6), true, 'en');
    expect(plan.some((r) => r.at.getDate() === 21)).toBe(false);
    expect(plan).toHaveLength(18);
    expect(plan[0].at.getDate()).toBe(22);
  });
  it('respects per-slot off and edited time', () => {
    const s = on();
    s.slots[0].on = false; s.slots[1].time = '13:15';
    const day = planReminders(s, at(6), false, 'en').filter((r) => r.at.getDate() === 22);
    expect(day.map((r) => `${r.at.getHours()}:${r.at.getMinutes()}`)).toEqual(['13:15', '20:30']);
  });
  it('plans nothing when disabled', () => {
    expect(planReminders({ ...on(), enabled: false }, at(6), false, 'en')).toEqual([]);
  });
  it('ids derive from date + slot', () => {
    expect(reminderId(new Date(2026, 10, 21), 2)).toBe(2611212);
  });
  it('[FB-58] copy is English only and rotates', () => {
    const en = planReminders(on(), at(6), false, 'en');
    expect(en[0].body).toBe(reminderLines('en')[0]);
    expect(reminderLines('en').join(' ')).not.toMatch(/[ạảãàáâấầẩẫậăắằẳẵặẹẻẽèéêếềểễệỉĩịọỏõòóôốồổỗộơớờởỡợụủũùúưứừửữựỳỷỹỵđ]/i);
    expect(new Set(en.map((r) => r.body)).size).toBeGreaterThan(1);
  });
});

describe('replanReminders', () => {
  it('cancels our old reminders (not others) and schedules inexact+idle with icon', async () => {
    const { p, state } = mockPlugin('granted', [{ id: 1, extra: { lvReminder: true } }, { id: 2, extra: { other: true } }]);
    const n = await replanReminders(p, on(), at(6), false, 'en');
    expect(n).toBe(21);
    expect(p.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
    expect(state.pending.some((x) => x.id === 2)).toBe(true);
    const first = (p.schedule.mock.calls[0][0].notifications[0]) as any;
    expect(first.schedule.allowWhileIdle).toBe(true);
    expect(first.schedule.exact).toBeUndefined();
    expect(first.smallIcon).toBe('ic_stat_notify');
    expect(first.extra.route).toBe('learn');
  });
  it('[FB-07] after studying, reschedules from tomorrow', async () => {
    const { p } = mockPlugin();
    await replanReminders(p, on(), at(6), false, 'en');
    const n = await replanReminders(p, on(), at(9), true, 'en');
    expect(n).toBe(18);
    const days = p.schedule.mock.calls[1][0].notifications.map((x: any) => x.schedule.at.getDate());
    expect(Math.min(...days)).toBe(22);
  });
  it('toggle off cancels everything and schedules nothing', async () => {
    const { p, state } = mockPlugin();
    await replanReminders(p, on(), at(6), false, 'en');
    const n = await replanReminders(p, { ...on(), enabled: false }, at(6), false, 'en');
    expect(n).toBe(0);
    expect(state.pending).toHaveLength(0);
  });
  it('schedules nothing without permission', async () => {
    const { p } = mockPlugin('denied');
    expect(await replanReminders(p, on(), at(6), false, 'en')).toBe(0);
    expect(p.schedule).not.toHaveBeenCalled();
  });
});

describe('permission flow', () => {
  it('ensurePermission: granted, denied (no prompt), prompt -> request', async () => {
    expect(await ensurePermission(mockPlugin('granted').p)).toBe('granted');
    const d = mockPlugin('denied');
    expect(await ensurePermission(d.p)).toBe('denied');
    expect(d.p.requestPermissions).not.toHaveBeenCalled();
    const pr = mockPlugin('prompt');
    expect(await ensurePermission(pr.p)).toBe('granted');
    expect(pr.p.requestPermissions).toHaveBeenCalledTimes(1);
  });
  it('toggle on while denied keeps it off', async () => {
    const { p } = mockPlugin('denied'); window.__LV_LOCAL_NOTIFICATIONS__ = p;
    expect(await setRemindersEnabled(true)).toBe('denied');
    expect(loadSettings().enabled).toBe(false);
    expect(p.schedule).not.toHaveBeenCalled();
  });
  it('toggle on when granted enables and schedules; off cancels', async () => {
    const { p, state } = mockPlugin('granted'); window.__LV_LOCAL_NOTIFICATIONS__ = p;
    await setRemindersEnabled(true);
    expect(loadSettings().enabled).toBe(true);
    expect(state.pending.length).toBeGreaterThan(0);
    await setRemindersEnabled(false);
    expect(loadSettings().enabled).toBe(false);
    expect(state.pending).toHaveLength(0);
  });
  it('auto-asks at most once; a denial is never re-asked', async () => {
    const { p, state } = mockPlugin('prompt'); window.__LV_LOCAL_NOTIFICATIONS__ = p;
    state.display = 'prompt';
    p.requestPermissions.mockImplementationOnce(async () => ({ display: 'denied' }));
    await maybeAutoAsk();
    expect(loadSettings()).toMatchObject({ enabled: false, autoAsked: true });
    await maybeAutoAsk();
    expect(p.requestPermissions).toHaveBeenCalledTimes(1);
  });
  it('auto-ask granted switches reminders on', async () => {
    const { p } = mockPlugin('prompt'); window.__LV_LOCAL_NOTIFICATIONS__ = p;
    await maybeAutoAsk();
    expect(loadSettings().enabled).toBe(true);
  });
  it('no plugin (web): everything is a no-op', async () => {
    expect(await replanNow()).toBe(0);
    await maybeAutoAsk();
    expect(loadSettings().autoAsked).toBe(false);
  });
});

describe('study signal', () => {
  it('marks today and fires the event with first=true once', () => {
    const seen: boolean[] = [];
    const h = (e: Event) => seen.push((e as CustomEvent).detail.first);
    window.addEventListener('lv:studied', h);
    expect(hasStudiedToday()).toBe(false);
    markStudiedToday('play'); markStudiedToday('quiz');
    window.removeEventListener('lv:studied', h);
    expect(hasStudiedToday()).toBe(true);
    expect(seen).toEqual([true, false]);
  });
  it('[FB-07] replanNow skips today once studied', async () => {
    const { p } = mockPlugin(); window.__LV_LOCAL_NOTIFICATIONS__ = p;
    saveSettings(on());
    markStudiedToday('mark');
    await replanNow();
    const days = p.schedule.mock.calls[0][0].notifications.map((x: any) => x.schedule.at.getDate());
    expect(days).not.toContain(new Date().getDate());
  });
});
