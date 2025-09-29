

export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  translation?: string;
  count: number | string; // This allows both number and string types
  category?: string; // Making category optional to support existing default vocabulary data
  nextAllowedTime?: string;
}

export type TodayWordSrs = {
  in_review_queue?: boolean | null;
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

export interface TodayWord extends VocabularyWord {
  word_id: string;
  category: string;
  is_due: boolean;
  srs?: TodayWordSrs | null;
}

export type ReadonlyWord = Readonly<VocabularyWord>;

// Interface for editing or adding words where category is required
export interface SheetData {
  [key: string]: VocabularyWord[];
}
