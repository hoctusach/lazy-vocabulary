export type UserPreferences = {
  favorite_voice?: string | null;
  speech_rate?: number | null;
  is_muted: boolean;
  is_playing: boolean;
  daily_option?: string | null;
};

export type LearnedWord = {
  word_id: string;
  in_review_queue: boolean;
  learned_at?: string | null; // ISO timestamp
  review_count?: number | null;
  last_review_at?: string | null;
  next_review_at?: string | null; // ISO timestamp
  next_display_at?: string | null; // ISO timestamp
  last_seen_at?: string | null;
  srs_interval_days?: number | null;
  srs_easiness?: number | null;
  srs_state?: string | null;
};
