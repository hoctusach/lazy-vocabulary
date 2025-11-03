import type { LearnedWord } from '@/core/models';

export type LearnedWordUpsert = {
  in_review_queue: boolean;
  review_count?: number | null;
  learned_at?: string | null;
  last_review_at?: string | null;
  next_review_at?: string | null;
  next_display_at?: string | null;
  last_seen_at?: string | null;
  srs_interval_days?: number | null;
  srs_ease?: number | null;
  srs_state?: string | null;
};

export async function getLearned(): Promise<LearnedWord[]> {
  return [];
}

export async function upsertLearned(
  wordId: string,
  payload: LearnedWordUpsert
): Promise<void> {
  void wordId;
  void payload;
}

export async function resetLearned(wordId: string): Promise<void> {
  void wordId;
}
