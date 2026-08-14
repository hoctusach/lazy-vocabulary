import { useEffect } from 'react';
import { toast } from 'sonner';
import { ensureUserKey } from '@/lib/progress/srsSyncByUserKey';
import { getProgressSummary } from '@/lib/progress/progressSummary';
import { calculateCurrentStreak, hasLearnedToday } from '@/lib/progress/streak';

const REMINDER_GUARD_KEY = 'lazyVoca.reminder.lastShownDay';
const INITIAL_CHECK_DELAY_MS = 4000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function wasAlreadyShownToday(): boolean {
  try {
    return localStorage.getItem(REMINDER_GUARD_KEY) === todayKey();
  } catch {
    return false;
  }
}

function markShownToday(): void {
  try {
    localStorage.setItem(REMINDER_GUARD_KEY, todayKey());
  } catch {
    // ignore storage failures
  }
}

function reminderMessage(streakDays: number): string {
  return streakDays > 0
    ? `Don't lose your ${streakDays}-day streak — learn today's words.`
    : "You haven't learned today's words yet.";
}

/**
 * Nudges a returning user who hasn't done today's words yet: an in-app toast
 * while the tab is visible, or a plain browser Notification while it's hidden
 * (only if permission was already granted — see NotificationManager).
 * There is no server push here, so this only reaches an already-open tab.
 */
export function useDailyReminder(): void {
  useEffect(() => {
    let cancelled = false;

    const maybeRemind = async () => {
      if (wasAlreadyShownToday()) return;

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

      const message = reminderMessage(calculateCurrentStreak(summary.learned_days));

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
          markShownToday();
        } catch {
          // Unsupported in this environment (e.g. iOS Safari) — the in-app
          // toast will still cover it once the tab becomes visible again.
        }
        return;
      }

      toast(message, { duration: 8000 });
      markShownToday();
    };

    const initialTimer = window.setTimeout(() => {
      void maybeRemind();
    }, INITIAL_CHECK_DELAY_MS);

    const onVisibilityChange = () => {
      void maybeRemind();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}
