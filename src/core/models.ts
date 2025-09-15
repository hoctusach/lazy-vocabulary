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
  learned_at?: string; // ISO timestamp
};
