import { getDeviceInfo } from '@/utils/deviceInfo';

const DEFAULT_GA_MEASUREMENT_ID = 'G-HQ5Q01TG2L';

type DailySelectionEventTrigger = 'auto' | 'generate' | 'regenerate';

interface DailySelectionEventDetails {
  trigger: DailySelectionEventTrigger;
  mode?: string | null;
  count?: number | null;
  category?: string | null;
  source?: string | null;
  wordCount?: number | null;
  newCount?: number | null;
  dueCount?: number | null;
}

interface WordResetDetails {
  wordId: string;
  word?: string | null;
  category?: string | null;
  trigger?: string | null;
}

interface WordSearchDetails {
  query: string;
  resultCount: number;
  source?: string | null;
  durationMs?: number | null;
}

function resolveMeasurementId(): string {
  const envId = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GA_MEASUREMENT_ID : undefined;
  const trimmed = typeof envId === 'string' ? envId.trim() : '';

  if (!trimmed || trimmed === 'undefined') {
    return DEFAULT_GA_MEASUREMENT_ID;
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === '0' || lowered === 'false' || lowered === 'disabled' || lowered === 'none') {
    return '';
  }

  return trimmed;
}

const GA_MEASUREMENT_ID = resolveMeasurementId();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let sessionLearnedCount = 0;
let currentSessionId: string | null = null;
let currentUserKey: string | null = null;

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `session_${Date.now()}_${random}`;
}

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

function enrichParams(params: Record<string, unknown> = {}): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...params };

  if (currentUserKey && enriched.user_key == null) {
    enriched.user_key = currentUserKey;
  }

  if (currentSessionId && enriched.session_id == null) {
    enriched.session_id = currentSessionId;
  }

  return enriched;
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (!eventName || !isAnalyticsReady()) {
    return;
  }

  const payload = sanitizeParams(enrichParams(params));
  window.gtag?.('event', eventName, payload);
}

export function identifyUser(userKey: string, nickname?: string | null): void {
  if (!userKey || !isAnalyticsReady()) {
    return;
  }

  const device = getDeviceInfo();
  const safeNickname = nickname?.trim()?.length ? nickname.trim() : undefined;

  currentUserKey = userKey;

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
  currentUserKey = userKey;
  currentSessionId = generateSessionId();
  sessionLearnedCount = 0;

  trackEvent('session_start', {
    user_key: userKey,
    start_time: new Date().toISOString(),
    device_type: device.type,
    device_os: device.os,
    session_id: currentSessionId,
    engagement_time_msec: 0,
    transport_type: 'beacon',
  });
}

export function trackSessionEnd(userKey: string, durationSec: number): void {
  if (!userKey || !isAnalyticsReady()) {
    return;
  }

  const device = getDeviceInfo();
  const safeDuration = Math.max(0, durationSec);
  const learningHours = Number((safeDuration / 3600).toFixed(3));
  const engagementMs = Math.max(0, Math.round(safeDuration * 1000));
  const sessionId = currentSessionId ?? generateSessionId();

  trackEvent('session_end', {
    user_key: userKey,
    duration_sec: safeDuration,
    learned_count: sessionLearnedCount,
    learning_hours: learningHours,
    device_type: device.type,
    device_os: device.os,
    session_id: sessionId,
    engagement_time_msec: engagementMs,
    transport_type: 'beacon',
  });

  sessionLearnedCount = 0;
  currentSessionId = null;
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

export function trackPageView(path: string, title?: string | null): void {
  if (!isAnalyticsReady()) {
    return;
  }

  const safePath = path || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const pageLocation = typeof window !== 'undefined' ? window.location.href : undefined;

  trackEvent('page_view', {
    page_path: safePath,
    page_title: title ?? (typeof document !== 'undefined' ? document.title : undefined),
    page_location: pageLocation,
  });
}

export function trackUiInteraction(
  eventName: string,
  options: {
    label?: string;
    value?: number;
    context?: Record<string, unknown>;
  } = {}
): void {
  const { label, value, context } = options;
  trackEvent(eventName, {
    event_category: 'interaction',
    event_label: label,
    value,
    ...(context ?? {}),
  });
}

export function trackDailySelectionEvent(
  action: 'loaded' | 'prepared' | 'regenerated',
  details: DailySelectionEventDetails
): void {
  const {
    trigger,
    mode,
    count,
    category,
    source,
    wordCount,
    newCount,
    dueCount,
  } = details;

  trackEvent(`daily_selection_${action}`, {
    trigger,
    mode: mode ?? null,
    count: count ?? null,
    category: category ?? null,
    source: source ?? null,
    word_count: wordCount,
    new_today_count: newCount,
    due_today_count: dueCount,
  });
}

export function trackWordReset(details: WordResetDetails): void {
  const { wordId, word, category, trigger } = details;
  const trimmedId = wordId.trim();

  trackEvent('word_reset_to_learning', {
    word_id: trimmedId || undefined,
    word: word?.trim() || undefined,
    category: category ?? null,
    trigger: trigger ?? 'manual',
  });
}

export function trackWordSearch(details: WordSearchDetails): void {
  const { query, resultCount, source, durationMs } = details;
  const trimmed = query.trim().slice(0, 120);

  trackEvent('word_search', {
    query: trimmed || undefined,
    query_length: trimmed.length,
    result_count: Math.max(0, resultCount),
    has_results: resultCount > 0,
    source: source ?? 'unknown',
    duration_ms: durationMs ?? undefined,
  });
}
