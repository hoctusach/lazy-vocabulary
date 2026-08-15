import { useEffect } from 'react';
import { toast } from 'sonner';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { getProgressSummary } from '@/lib/progress/progressSummary';
import { calculateCurrentStreak, hasLearnedToday } from '@/lib/progress/streak';
import { pickReminderMessage } from '@/lib/reminders/messages';

const REMINDER_STATE_KEY = 'lazyVoca.reminder.state';
const INITIAL_CHECK_DELAY_MS = 4000;
const PERIODIC_CHECK_INTERVAL_MS = 60_000;
const MIN_MINUTES_BETWEEN_REMINDERS = 10;
const MIN_INTERVAL_MS = MIN_MINUTES_BETWEEN_REMINDERS * 60_000;
const MAX_REMINDERS_PER_DAY = 3;

type ReminderState = {
  day: string;
  count: number;
  lastShownAt: number;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readState(): ReminderState {
  const fresh: ReminderState = { day: todayKey(), count: 0, lastShownAt: 0 };
  try {
    const raw = localStorage.getItem(REMINDER_STATE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<ReminderState>;
    if (parsed.day !== fresh.day) return fresh;
    return {
      day: fresh.day,
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      lastShownAt: typeof parsed.lastShownAt === 'number' ? parsed.lastShownAt : 0,
    };
  } catch {
    return fresh;
  }
}

function writeState(state: ReminderState): void {
  try {
    localStorage.setItem(REMINDER_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

/**
 * Nudges a returning user who hasn't done today's words yet, a few times a
 * day rather than once — an in-app toast while the tab is visible, or a
 * plain browser Notification while it's hidden (only if permission was
 * already granted — see NotificationManager). There is no server push here,
 * so this only reaches an already-open tab; it can't wake a closed one.
 */
export function useDailyReminder(): void {
  useEffect(() => {
    let cancelled = false;

    const maybeRemind = async () => {
      const state = readState();
      if (state.count >= MAX_REMINDERS_PER_DAY) return;
      if (state.lastShownAt && Date.now() - state.lastShownAt < MIN_INTERVAL_MS) return;

      let userKey: string | null = null;
      try {
        userKey = await ensureUserKey();
      } catch {
        return;
      }
      if (!userKey || cancelled) return;

      const summary = await getProgressSummary(userKey);
      if (cancelled || !summary) return;
      if (hasLearnedToday(summary.learned_days)) return;

      const streakDays = calculateCurrentStreak(summary.learned_days);
      const message = pickReminderMessage(streakDays, summary.learned_count);

      if (document.visibilityState === 'hidden') {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
          const notification = new Notification('Lazy Vocabulary', {
            body: message,
            icon: '/favicon.ico',
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
          writeState({ day: state.day, count: state.count + 1, lastShownAt: Date.now() });
        } catch {
          // Unsupported in this environment (e.g. iOS Safari) — the in-app
          // toast will still cover it once the tab becomes visible again.
        }
        return;
      }

      toast(message, { duration: 8000 });
      writeState({ day: state.day, count: state.count + 1, lastShownAt: Date.now() });
    };

    const initialTimer = window.setTimeout(() => {
      void maybeRemind();
    }, INITIAL_CHECK_DELAY_MS);

    const periodicInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void maybeRemind();
      }
    }, PERIODIC_CHECK_INTERVAL_MS);

    const onVisibilityChange = () => {
      void maybeRemind();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(periodicInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}
