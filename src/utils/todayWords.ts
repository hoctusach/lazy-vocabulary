import type { TodayWord } from '@/types/vocabulary';

const isReviewCandidate = (word: TodayWord): boolean => {
  const srs = word.srs ?? undefined;
  if (!srs) return false;
  if (srs.in_review_queue === false) return false;
  const reviewCount = srs.review_count ?? 0;
  if (reviewCount > 0) return true;
  const candidate = srs.next_review_at ?? srs.next_display_at;
  if (!candidate) return false;
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) && parsed <= Date.now();
};

const dueTimestamp = (word: TodayWord): number => {
  const candidate = word.srs?.next_display_at ?? word.srs?.next_review_at;
  if (!candidate) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

export function buildTodaysWords(words: TodayWord[], category: string): TodayWord[] {
  const filtered = category === 'ALL' ? words : words.filter(w => w.category === category);
  return [...filtered].sort((a, b) => {
    const aReview = isReviewCandidate(a);
    const bReview = isReviewCandidate(b);
    if (aReview !== bReview) {
      return aReview ? -1 : 1;
    }

    const aDue = dueTimestamp(a);
    const bDue = dueTimestamp(b);
    if (aDue !== bDue) {
      return aDue - bDue;
    }

    return a.word.localeCompare(b.word);
  });
}
