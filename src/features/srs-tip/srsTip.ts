export const SRS_TIP_STORAGE_KEY = 'lv.srsTip.dismissedOn';
export const SRS_TIP_FIRST_SEEN_KEY = 'lv.srsTip.firstSeenOn';
export const WORDS_PER_DAY = 20;
export const MIN_WORDS_FOR_PLAN_LINE = 100;

export interface SrsTipContent {
  kind: 'due' | 'intro';
  title: string;
  body?: string;
  line?: string;
}

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthsToFinish(total: number): number {
  return Math.round(total / WORDS_PER_DAY / 30);
}

export function buildSrsTip(opts: { isVietnamese: boolean; total: number; due: number }): SrsTipContent {
  const { isVietnamese: vi } = opts;
  const total = Number.isFinite(opts.total) ? Math.max(0, Math.floor(opts.total)) : 0;
  const due = Number.isFinite(opts.due) ? Math.max(0, Math.floor(opts.due)) : 0;
  if (due > 0) {
    return {
      kind: 'due',
      title: vi
        ? `${due} từ sắp bị quên. 3 phút để giữ lại.`
        : `${due} words are about to slip away. 3 minutes to save them.`,
    };
  }
  const months = monthsToFinish(total);
  const showLine = total >= MIN_WORDS_FOR_PLAN_LINE;
  return {
    kind: 'intro',
    title: vi ? 'Mỗi ngày 20 từ. Nhớ mãi không quên.' : '20 words a day. Never forget them.',
    body: vi
      ? 'App nhắc lại từng từ đúng lúc bạn sắp quên: sau 2, 3, 5, 7 ngày… rồi 60 ngày một lần.'
      : "Lazy Vocabulary brings each word back right before you'd forget it: 2, 3, 5, 7… then every 60 days.",
    line: showLine
      ? vi
        ? `20 từ/ngày → thuộc hết ${total} từ trong ~${months} tháng.`
        : `20 words/day → all ${total} words in ~${months} months.`
      : undefined,
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function isDismissedToday(now: Date = new Date()): boolean {
  try {
    return storage()?.getItem(SRS_TIP_STORAGE_KEY) === localDateKey(now);
  } catch {
    return false;
  }
}

export function dismissForToday(now: Date = new Date()): void {
  try {
    storage()?.setItem(SRS_TIP_STORAGE_KEY, localDateKey(now));
  } catch {
    /* storage unavailable: dismissal lasts for this session only */
  }
}

/**
 * True only on the calendar day the intro tip was first shown. Records today's
 * date the first time it is called. Later days return false so the explainer
 * starts collapsed (title + "Why?").
 */
export function isIntroFirstDay(now: Date = new Date()): boolean {
  const today = localDateKey(now);
  try {
    const s = storage();
    if (!s) return true;
    const seen = s.getItem(SRS_TIP_FIRST_SEEN_KEY);
    if (!seen) {
      s.setItem(SRS_TIP_FIRST_SEEN_KEY, today);
      return true;
    }
    return seen >= today;
  } catch {
    return false;
  }
}
