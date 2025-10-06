import { getDeviceInfo } from '@/utils/deviceInfo';

const GA_MEASUREMENT_ID = 'G-HQ5Q01TG2L';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let sessionLearnedCount = 0;

function isAnalyticsReady(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function' && !!GA_MEASUREMENT_ID;
}

function sanitizeParams<T extends Record<string, unknown>>(params: T): Record<string, unknown> {
  return Object.entries(params).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (!eventName || !isAnalyticsReady()) {
    return;
  }

  window.gtag?.('event', eventName, sanitizeParams(params));
}

export function identifyUser(userKey: string, nickname?: string | null): void {
  if (!userKey || !isAnalyticsReady()) {
    return;
  }

  const device = getDeviceInfo();
  const safeNickname = nickname?.trim()?.length ? nickname.trim() : undefined;

  window.gtag?.('set', 'user_properties', sanitizeParams({
    user_key: userKey,
    nickname: safeNickname,
    device_type: device.type,
    device_os: device.os,
  }));

  window.gtag?.('event', 'user_identified', sanitizeParams({
    user_key: userKey,
    nickname: safeNickname,
    device_type: device.type,
    device_os: device.os,
  }));

  window.gtag?.('config', GA_MEASUREMENT_ID, sanitizeParams({
    send_page_view: false,
    user_id: userKey,
  }));
}

export function trackSessionStart(userKey: string): void {
  if (!userKey || !isAnalyticsReady()) {
    return;
  }

  const device = getDeviceInfo();
  sessionLearnedCount = 0;

  trackEvent('session_start', {
    user_key: userKey,
    start_time: new Date().toISOString(),
    device_type: device.type,
  });
}

export function trackSessionEnd(userKey: string, durationSec: number): void {
  if (!userKey || !isAnalyticsReady()) {
    return;
  }

  const device = getDeviceInfo();
  const safeDuration = Math.max(0, durationSec);
  const learningHours = Number((safeDuration / 3600).toFixed(3));

  trackEvent('session_end', {
    user_key: userKey,
    duration_sec: safeDuration,
    learned_count: sessionLearnedCount,
    learning_hours: learningHours,
    device_type: device.type,
  });

  sessionLearnedCount = 0;
}

export function trackWordLearned(
  userKey: string,
  details: {
    wordId: string;
    category?: string | null;
    srsState?: string | null;
    srsIntervalDays?: number | null;
  },
): void {
  if (!userKey || !details.wordId || !isAnalyticsReady()) {
    return;
  }

  sessionLearnedCount += 1;

  trackEvent('word_learned', {
    user_key: userKey,
    word_id: details.wordId,
    category: details.category,
    srs_state: details.srsState,
    srs_interval_days: details.srsIntervalDays,
  });
}

export function trackReviewDue(
  userKey: string,
  details: {
    wordId: string;
    category?: string | null;
    srsIntervalDays?: number | null;
  },
): void {
  if (!userKey || !details.wordId || !isAnalyticsReady()) {
    return;
  }

  trackEvent('review_due', {
    user_key: userKey,
    word_id: details.wordId,
    category: details.category,
    srs_interval_days: details.srsIntervalDays,
  });
}
