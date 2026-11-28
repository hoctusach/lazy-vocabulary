// @vitest-environment jsdom
// [FB-73] Pause/Play toggle (no Stop) on the media notification. [FB-74] Daily reminder "Play" action (Android + iOS) and the
// new-day (user did not open the app that day) handling.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderHook } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import {
  PLAY_ACTION_ID, REMINDER_ACTION_TYPE, listenForTaps, reminderActionTypes, replanReminders, OPEN_LEARN_EVENT,
  type ReminderPlugin,
} from '@/lib/reminders/localReminders';
import { defaultSettings } from '@/lib/reminders/reminderSettings';
import { consumePlayIntent, hasPlayIntent, requestPlayToday, PLAY_INTENT_TTL_MS } from '@/lib/reminders/playIntent';
import { useNewDayWatcher, msUntilNextMidnight } from '@/hooks/useNewDayWatcher';
import { NEW_DAY_EVENT } from '@/features/word-sets/todayPlan';
import { syncWebMediaSession, setPlaybackHandlers } from '@/services/background/playbackService';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
const J = 'android/app/src/main/java/com/lazy/vocabulary/';

describe('[FB-73] media notification: Pause/Play toggle, no Stop', () => {
  const svc = read(J + 'PlaybackService.java');
  it('no Stop action anywhere in the notification; Pause<->Play toggle + Next remain', () => {
    expect(svc).not.toMatch(/addAction\([^;]*Stop/);
    expect(svc).not.toContain('ic_menu_close_clear_cancel');
    expect(svc).not.toContain('ACTION_STOP');
    expect((svc.match(/b\.addAction\(/g) ?? []).length).toBe(3); // Pause | Play (exclusive) + Next
    expect(svc).toMatch(/if \(playing\) \{\s*b\.addAction\([^;]*"Pause"[\s\S]*\} else \{\s*b\.addAction\([^;]*"Play"/);
  });
  it('Pause keeps the session: no shutdown / stopForeground / stopSelf in the pause path, watchdog + speech just stop', () => {
    const pause = svc.match(/ACTION_PAUSE\.equals\(action\)\) \{([\s\S]*?)\n        \}/)![1];
    expect(pause).toContain('setPlayingNative(false)');
    expect(pause).not.toMatch(/shutdown|stopForeground|stopSelf/);
    const setPlaying = svc.match(/private void setPlayingNative[\s\S]*?\n    \}/)![0];
    expect(setPlaying).not.toMatch(/shutdown|stopForeground|stopSelf|running = false/);
  });
  it('paused card: not ongoing, swipe-dismiss ends the session via the internal DISMISS intent (not a button)', () => {
    expect(svc).toContain('.setOngoing(playing)');
    expect(svc).toContain('.setDeleteIntent(servicePi(ACTION_DISMISS');
    expect(svc).toMatch(/ACTION_DISMISS\.equals\(action\)\) \{\s*shutdown\(\)/);
  });
  it('Android 13/14: media-playback foreground-service type declared (manifest + startForeground) and POST_NOTIFICATIONS', () => {
    const m = read('android/app/src/main/AndroidManifest.xml');
    expect(m).toContain('android:foregroundServiceType="mediaPlayback"');
    expect(m).toContain('FOREGROUND_SERVICE_MEDIA_PLAYBACK');
    expect(m).toContain('POST_NOTIFICATIONS');
    expect(svc).toContain('FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK');
  });
  it('iOS Now Playing: play + pause handlers (toggle) and next, NO stop handler', () => {
    const handlers: Record<string, unknown> = {};
    const ms = { setActionHandler: vi.fn((a: string, h: unknown) => { handlers[a] = h; }), metadata: null, playbackState: 'none' };
    vi.stubGlobal('MediaMetadata', class { constructor(public init: unknown) {} });
    Object.defineProperty(navigator, 'mediaSession', { value: ms, configurable: true });
    const onPlay = vi.fn(); const onPause = vi.fn();
    setPlaybackHandlers({ onPlay, onPause, onNext: vi.fn() });
    syncWebMediaSession({ title: 'w', text: 'm', playing: true });
    expect(typeof handlers.play).toBe('function');
    expect(typeof handlers.pause).toBe('function');
    expect(typeof handlers.nexttrack).toBe('function');
    expect(handlers.stop).toBeNull();
    (handlers.pause as () => void)(); (handlers.play as () => void)();
    expect(onPause).toHaveBeenCalledTimes(1); expect(onPlay).toHaveBeenCalledTimes(1);
    syncWebMediaSession({ title: 'w', text: 'm', playing: false });
    expect(ms.playbackState).toBe('paused'); // session + metadata stay, just paused
    expect(ms.metadata).not.toBeNull();
    setPlaybackHandlers(null);
  });
});

function mock(): ReminderPlugin & Record<string, ReturnType<typeof vi.fn>> {
  return {
    checkPermissions: vi.fn(async () => ({ display: 'granted' })),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    getPending: vi.fn(async () => ({ notifications: [] })),
    cancel: vi.fn(async () => undefined),
    schedule: vi.fn(async () => undefined),
    registerActionTypes: vi.fn(async () => undefined),
    addListener: vi.fn(async () => ({ remove() {} })),
  } as never;
}

describe('[FB-74] daily reminder Play action', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each(['android', 'ios'])('%s: reminders are scheduled with the Play category', async (platform) => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue(platform);
    const p = mock();
    await replanReminders(p, { ...defaultSettings(), enabled: true }, new Date(2026, 10, 21, 6), false, 'en');
    const types = (p.registerActionTypes as ReturnType<typeof vi.fn>).mock.calls[0][0].types;
    expect(types).toEqual(reminderActionTypes(platform));
    expect(types[0].id).toBe(REMINDER_ACTION_TYPE);
    expect(types[0].actions.map((a: { id: string }) => a.id)).toEqual([PLAY_ACTION_ID]);
    expect(types[0].actions[0].title).toBe('Play');
    // iOS: UNNotificationAction must open the app (foreground). Android's plugin buttons always launch MainActivity.
    expect(!!types[0].actions[0].foreground).toBe(platform === 'ios');
    const notes = (p.schedule as ReturnType<typeof vi.fn>).mock.calls[0][0].notifications;
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((n: Record<string, unknown>) => n.actionTypeId === REMINDER_ACTION_TYPE)).toBe(true);
  });
  it('a plugin without registerActionTypes / a failing register still schedules plain reminders', async () => {
    const p = mock();
    (p.registerActionTypes as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('x'));
    const n = await replanReminders(p, { ...defaultSettings(), enabled: true }, new Date(2026, 10, 21, 6), false, 'en');
    expect(n).toBeGreaterThan(0);
    expect((p.schedule as ReturnType<typeof vi.fn>).mock.calls[0][0].notifications[0].actionTypeId).toBeUndefined();
  });
  it('tap = opens Learn only; Play action = opens Learn AND requests today\'s playback; other apps\' notifications ignored', async () => {
    const p = mock();
    window.__LV_LOCAL_NOTIFICATIONS__ = p;
    const open = vi.fn(); window.addEventListener(OPEN_LEARN_EVENT, open);
    // listener is registered once per module instance
    vi.resetModules();
    const m = await import('@/lib/reminders/localReminders');
    const pi = await import('@/lib/reminders/playIntent');
    await m.listenForTaps();
    const cb = (p.addListener as ReturnType<typeof vi.fn>).mock.calls[0][1] as (e: unknown) => void;
    pi.consumePlayIntent();
    cb({ actionId: 'tap', notification: { extra: { lvReminder: true } } });
    expect(open).toHaveBeenCalledTimes(1); expect(pi.hasPlayIntent()).toBe(false);
    cb({ actionId: 'play', notification: { extra: { lvReminder: true } } });
    expect(open).toHaveBeenCalledTimes(2); expect(pi.hasPlayIntent()).toBe(true);
    pi.consumePlayIntent();
    cb({ actionId: 'play', notification: { extra: {} } });
    expect(pi.hasPlayIntent()).toBe(false);
    window.removeEventListener(OPEN_LEARN_EVENT, open);
    delete window.__LV_LOCAL_NOTIFICATIONS__;
    void listenForTaps;
  });
  it('cold start: the Play request is held until today\'s words are ready, consumed once, and expires (never autoplays later)', () => {
    const t0 = 1_000_000;
    requestPlayToday(t0);
    expect(hasPlayIntent(t0 + 1000)).toBe(true);
    expect(consumePlayIntent(t0 + 2000)).toBe(true);
    expect(consumePlayIntent(t0 + 2001)).toBe(false);
    requestPlayToday(t0);
    expect(consumePlayIntent(t0 + PLAY_INTENT_TTL_MS + 1)).toBe(false);
  });
});

describe('[FB-74] new day without opening the app (fake clock across midnight)', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
  afterEach(() => { vi.useRealTimers(); });
  it('msUntilNextMidnight lands just after local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 21, 23, 59, 0))).toBe(61_000);
  });
  it('process alive across midnight: NEW_DAY fires once at 00:00:01, not before, and re-arms for the next day', async () => {
    vi.setSystemTime(new Date(2026, 10, 21, 23, 30, 0));
    const fired = vi.fn(); window.addEventListener(NEW_DAY_EVENT, fired);
    const { unmount } = renderHook(() => useNewDayWatcher());
    await vi.advanceTimersByTimeAsync(29 * 60_000);
    expect(fired).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(fired).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(24 * 3600_000);
    expect(fired).toHaveBeenCalledTimes(2);
    unmount(); window.removeEventListener(NEW_DAY_EVENT, fired);
  });
  it('frozen timers (screen off) but resumed next morning: visibilitychange detects the new day', async () => {
    vi.setSystemTime(new Date(2026, 10, 21, 22, 0, 0));
    const fired = vi.fn(); window.addEventListener(NEW_DAY_EVENT, fired);
    renderHook(() => useNewDayWatcher());
    vi.setSystemTime(new Date(2026, 10, 22, 7, 0, 0)); // clock jumped, no timer ran
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fired).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('visibilitychange')); // same day again: no duplicate
    expect(fired).toHaveBeenCalledTimes(1);
    window.removeEventListener(NEW_DAY_EVENT, fired);
  });
  it('reminders re-plan on the new day: yesterday\'s studied flag no longer suppresses today', async () => {
    const { hasStudiedToday, markStudiedToday } = await import('@/lib/reminders/studySignal');
    vi.setSystemTime(new Date(2026, 10, 21, 21, 0, 0));
    markStudiedToday('play');
    expect(hasStudiedToday()).toBe(true);
    vi.setSystemTime(new Date(2026, 10, 22, 6, 0, 0));
    expect(hasStudiedToday()).toBe(false);
  });
  it('reminders for the next 14 days exist even if the app is never opened (id per date+slot, no collisions)', async () => {
    const { planReminders } = await import('@/lib/reminders/reminderPlanner');
    const plan = planReminders({ ...defaultSettings(), enabled: true }, new Date(2026, 10, 21, 6), false, 'en');
    expect(new Set(plan.map((r) => r.id)).size).toBe(plan.length);
    expect(plan.length).toBeLessThanOrEqual(63); // iOS pending-notification cap is 64
    expect(plan[plan.length - 1].at.getDate()).toBe(4); // 4 Dec
  });
  it('boot / exact-alarm wiring (plugin manifest): reminders survive a reboot; inexact allowWhileIdle needs no exact-alarm permission', () => {
    const lm = read('node_modules/@capacitor/local-notifications/android/src/main/AndroidManifest.xml');
    expect(lm).toContain('BOOT_COMPLETED');
    expect(lm).toContain('LocalNotificationRestoreReceiver');
    expect(read('src/lib/reminders/localReminders.ts')).toContain('allowWhileIdle: true');
  });
});

describe('[FB-74] app wiring', () => {
  it('Index mounts the new-day watcher; Learn reloads today on NEW_DAY; container consumes the play intent', () => {
    expect(read('src/pages/Index.tsx')).toContain('useNewDayWatcher()');
    expect(read('src/hooks/useLearningProgress.tsx')).toMatch(/NEW_DAY_EVENT[\s\S]*dayTick/);
    expect(read('src/components/vocabulary-app/VocabularyAppContainerNew.tsx')).toContain('consumePlayIntent');
  });
  it('iOS CI has a non-blocking simulator step for the Play action', () => {
    const y = read('.github/workflows/ios.yml');
    expect(y).toContain('Reminder Play action');
    expect(y).toMatch(/Reminder Play action[\s\S]*continue-on-error: true/);
  });
});
