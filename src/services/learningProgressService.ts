import type { DailySelection, LearningProgress, SeverityLevel } from '@/types/learning';
import type { TodayWord, TodayWordSrs } from '@/types/vocabulary';
import { CUSTOM_AUTH_MODE } from '@/lib/customAuthMode';
import { resetLearned } from '@/lib/db/learned';
import type { LearnedWordUpsert } from '@/lib/db/learned';
import { getProgressSummary, type ProgressSummaryFields } from '@/lib/progress/progressSummary';
import { ensureUserKey, markLearnedServerByKey } from '@/lib/progress/srsSyncByUserKey';
import { getSupabaseClient } from '@/lib/supabaseClient';

const DEFAULT_SEVERITY_CONFIG: Record<SeverityLevel, { min: number; max: number }> = {
  light: { min: 15, max: 25 },
  moderate: { min: 30, max: 50 },
  intense: { min: 50, max: 100 }
};

const REVIEW_INTERVALS_DAYS = [1, 2, 3, 5, 7, 10, 14, 21, 28, 35];
const MASTER_INTERVAL_DAYS = 60;
const EXPOSURE_DELAYS_MINUTES = [0, 5, 7, 10, 15, 30, 60, 90, 120];
const MASTER_EXPOSURE_DELAY_MINUTES = 180;

const TODAY_WORDS_PREFIX = 'todayWords:';
const ACTIVE_USER_KEY = 'todayWords.activeUser';

export type TodayWordResponse = TodayWord;

type DailySelectionRow = {
  word_id: string;
  category: string | null;
};

type VocabularyRow = {
  word_id: string;
  word: string;
  meaning: string;
  example: string;
  translation?: string | null;
  category?: string | null;
  count?: number | string | null;
};

type LearnedRow = {
  word_id: string;
  in_review_queue: boolean | null;
  review_count: number | null;
  learned_at: string | null;
  last_review_at: string | null;
  next_review_at: string | null;
  next_display_at: string | null;
  last_seen_at: string | null;
  srs_interval_days: number | null;
  srs_easiness: number | null;
  srs_state: string | null;
};

type DailyWordsResult = {
  words: TodayWord[];
  selection: DailySelection;
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

export const todayKeyFor = (userKey: string, d = new Date()) => `${TODAY_WORDS_PREFIX}${userKey}:${toDateKey(d)}`;

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toIsoDate(dateKey: string | null | undefined): string | null {
  if (!dateKey) return null;
  const trimmed = dateKey.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  const candidate = `${trimmed}T00:00:00.000Z`;
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function computeIntervalDays(learnedAt?: string | null, nextReviewAt?: string | null): number | null {
  if (!learnedAt || !nextReviewAt) return null;
  const start = Date.parse(learnedAt);
  const end = Date.parse(nextReviewAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const diff = Math.max(0, end - start);
  return Math.round(diff / 86_400_000);
}

function isDue(srs?: TodayWordSrs | null): boolean {
  if (!srs) return false;
  const candidate = srs.next_review_at ?? srs.next_display_at;
  if (!candidate) return false;
  const parsed = Date.parse(candidate);
  if (Number.isNaN(parsed)) return false;
  const now = Date.now();
  return parsed <= now;
}

function isLearnedState(srs?: TodayWordSrs | null): boolean {
  if (!srs) return false;
  if (srs.in_review_queue === false) return true;
  if ((srs.review_count ?? 0) >= REVIEW_INTERVALS_DAYS.length + 1) return true;
  const state = (srs.srs_state ?? '').toLowerCase();
  return state === 'learned';
}

function isReviewCandidate(srs?: TodayWordSrs | null): boolean {
  if (!srs) return false;
  if (srs.in_review_queue === false) return false;
  return (srs.review_count ?? 0) > 0 || isDue(srs);
}

function determineStatus(reviewCount: number, nextReviewIso: string, isLearned: boolean): LearningProgress['status'] {
  if (!isLearned || reviewCount === 0) return 'new';
  if (!nextReviewIso) return 'learned';
  return isDue({ next_review_at: nextReviewIso })
    ? 'due'
    : reviewCount >= REVIEW_INTERVALS_DAYS.length + 1
      ? 'learned'
      : 'not_due';
}

function toSrsState(status: LearningProgress['status']): string {
  switch (status) {
    case 'due':
      return 'review';
    case 'learned':
      return 'learned';
    case 'not_due':
      return 'learning';
    default:
      return 'new';
  }
}

function shouldRemainInQueue(status: LearningProgress['status']): boolean {
  if (status === 'learned') return false;
  if (status === 'new') return false;
  return true;
}

function coerceCategory(category?: string | null): string {
  const trimmed = (category ?? '').trim();
  return trimmed || 'general';
}

export class LearningProgressService {
  private severityConfig = DEFAULT_SEVERITY_CONFIG;

  static getInstance() {
    return new LearningProgressService();
  }

  private getStorage(): Storage | null {
    try {
      const globalRef = globalThis as unknown as { localStorage?: Storage };
      return globalRef?.localStorage ?? null;
    } catch (error) {
      console.warn('[LearningProgressService] localStorage unavailable', error);
      return null;
    }
  }

  private listStorageKeys(): string[] {
    const storage = this.getStorage();
    if (!storage) return [];
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  private loadTodayWords(userKey: string, date = new Date()): TodayWord[] {
    const storage = this.getStorage();
    if (!storage) return [];
    const cached = safeParseJSON<TodayWord[]>(storage.getItem(todayKeyFor(userKey, date)));
    if (!Array.isArray(cached)) return [];
    return cached;
  }

  private saveTodayWords(userKey: string, words: TodayWord[], date = new Date()): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      storage.setItem(todayKeyFor(userKey, date), JSON.stringify(words));
      storage.setItem(ACTIVE_USER_KEY, userKey);
    } catch (error) {
      console.warn('[LearningProgressService] Failed to persist today words', error);
    }
  }

  private clearTodayWordsForUser(userKey: string): void {
    const storage = this.getStorage();
    if (!storage) return;
    const prefix = `${TODAY_WORDS_PREFIX}${userKey}:`;
    const keysToRemove = this.listStorageKeys().filter(key => key.startsWith(prefix));
    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  }

  private clearStaleCaches(currentUserKey: string, date = new Date()): void {
    const storage = this.getStorage();
    if (!storage) return;
    const todayIso = toDateKey(date);
    const keys = this.listStorageKeys();
    for (const key of keys) {
      if (!key.startsWith(TODAY_WORDS_PREFIX)) continue;
      const [, userKey, cachedDate] = key.split(':');
      if (!cachedDate || cachedDate === todayIso) continue;
      storage.removeItem(key);
      if (userKey && userKey !== currentUserKey) {
        const legacyPrefix = `${TODAY_WORDS_PREFIX}${userKey}:`;
        if (key.startsWith(legacyPrefix)) {
          storage.removeItem(key);
        }
      }
    }

    const activeUser = storage.getItem(ACTIVE_USER_KEY);
    if (activeUser && activeUser !== currentUserKey) {
      this.clearTodayWordsForUser(activeUser);
    }
    storage.setItem(ACTIVE_USER_KEY, currentUserKey);
  }

  private resolveCount(severity: SeverityLevel): number {
    const config = this.severityConfig[severity] ?? this.severityConfig.light;
    return config.max;
  }

  private async generateDailySelection(
    userKey: string,
    mode: SeverityLevel,
    count: number,
    category?: string | null
  ): Promise<DailySelectionRow[]> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client unavailable');
    if (CUSTOM_AUTH_MODE) throw new Error('Daily selection is unavailable in custom auth mode');

    const { data, error } = await client.rpc('generate_daily_selection', {
      user_unique_key: userKey,
      mode,
      count,
      category: category ?? null
    });

    if (error) {
      throw new Error(error.message);
    }

    const rows: DailySelectionRow[] = Array.isArray(data)
      ? (data as DailySelectionRow[])
      : [];
    return rows.filter(row => typeof row?.word_id === 'string');
  }

  private async commitDailySelection(userKey: string, wordIds: string[]): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client unavailable');
    if (CUSTOM_AUTH_MODE) throw new Error('Daily selection is unavailable in custom auth mode');

    const { error } = await client.rpc('commit_daily_selection', {
      user_unique_key: userKey,
      word_ids: wordIds
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  private async requestDailySelectionFromServer(
    userKey: string,
    mode: SeverityLevel,
    count: number,
    category?: string | null
  ): Promise<TodayWord[]> {
    const selection = await this.generateDailySelection(userKey, mode, count, category);
    const wordIds = selection
      .map(row => row.word_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    await this.commitDailySelection(userKey, wordIds);

    if (selection.length === 0 || wordIds.length === 0) {
      return [];
    }

    let vocabMap: Record<string, VocabularyRow> = {};
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        vocabMap = await this.fetchVocabularyByIds(wordIds);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!vocabMap || Object.keys(vocabMap).length === 0) {
      throw lastError instanceof Error ? lastError : new Error('Failed to fetch vocabulary details');
    }

    const srsMap = await this.fetchSrsRows(userKey, wordIds);
    return this.mergeWordData(selection, vocabMap, srsMap);
  }

  private async fetchVocabularyByIds(wordIds: string[]): Promise<Record<string, VocabularyRow>> {
    if (wordIds.length === 0) return {};
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client unavailable');
    if (CUSTOM_AUTH_MODE) throw new Error('Vocabulary fetch unavailable in custom auth mode');

    const { data, error } = await client.rpc('fetch_vocabulary_by_ids', {
      word_ids: wordIds
    });

    if (error) {
      throw new Error(error.message);
    }

    const rows: VocabularyRow[] = Array.isArray(data)
      ? (data as VocabularyRow[])
      : [];

    const map: Record<string, VocabularyRow> = {};
    for (const row of rows) {
      if (!row || typeof row.word_id !== 'string') continue;
      map[row.word_id] = row;
    }
    return map;
  }

  private async fetchSrsRows(userKey: string, wordIds: string[]): Promise<Record<string, LearnedRow>> {
    if (wordIds.length === 0) return {};
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client unavailable');
    if (CUSTOM_AUTH_MODE) throw new Error('SRS fetch unavailable in custom auth mode');

    const { data, error } = await client
      .from('learned_words')
      .select(
        'word_id,in_review_queue,review_count,learned_at,last_review_at,next_review_at,next_display_at,last_seen_at,srs_interval_days,srs_easiness,srs_state'
      )
      .eq('user_unique_key', userKey)
      .in('word_id', wordIds);

    if (error) {
      throw new Error(error.message);
    }

    const rows: LearnedRow[] = Array.isArray(data)
      ? (data as LearnedRow[])
      : [];

    const map: Record<string, LearnedRow> = {};
    for (const row of rows) {
      if (!row || typeof row.word_id !== 'string') continue;
      map[row.word_id] = row;
    }
    return map;
  }

  private mergeWordData(
    selection: DailySelectionRow[],
    vocabMap: Record<string, VocabularyRow>,
    srsMap: Record<string, LearnedRow>
  ): TodayWord[] {
    const words: TodayWord[] = [];
    for (const row of selection) {
      if (!row?.word_id) continue;
      const vocab = vocabMap[row.word_id];
      if (!vocab) continue;
      const learned = srsMap[row.word_id];
      const srs: TodayWordSrs | undefined = learned
        ? {
            in_review_queue: learned.in_review_queue,
            review_count: learned.review_count,
            learned_at: learned.learned_at,
            last_review_at: learned.last_review_at,
            next_review_at: learned.next_review_at,
            next_display_at: learned.next_display_at,
            last_seen_at: learned.last_seen_at,
            srs_interval_days: learned.srs_interval_days,
            srs_easiness: learned.srs_easiness,
            srs_state: learned.srs_state
          }
        : undefined;

      words.push({
        word_id: row.word_id,
        word: vocab.word,
        meaning: vocab.meaning,
        example: vocab.example,
        translation: vocab.translation ?? undefined,
        count: vocab.count ?? 0,
        category: coerceCategory(vocab.category ?? row.category ?? undefined),
        nextAllowedTime: srs?.next_display_at ?? undefined,
        srs
      });
    }
    return words;
  }

  private toLearningProgress(word: TodayWord): LearningProgress {
    const srs = word.srs ?? undefined;
    const reviewCount = srs?.review_count ?? 0;
    const learnedAt = srs?.learned_at ?? null;
    const nextReviewIso = srs?.next_review_at ?? null;
    const nextReviewDate = nextReviewIso ? toDateKey(new Date(nextReviewIso)) : '';
    const status = determineStatus(reviewCount, nextReviewIso ?? '', isLearnedState(srs));

    return {
      word: word.word,
      type: undefined,
      category: word.category,
      isLearned: isLearnedState(srs),
      reviewCount,
      lastPlayedDate: srs?.last_review_at ?? '',
      status,
      nextReviewDate,
      createdDate: learnedAt ? toDateKey(new Date(learnedAt)) : toDateKey(new Date()),
      learnedDate: learnedAt ?? undefined,
      nextAllowedTime: srs?.next_display_at ?? undefined
    };
  }

  private buildSelection(words: TodayWord[], severity: SeverityLevel): DailySelection {
    const reviewWords: LearningProgress[] = [];
    const newWords: LearningProgress[] = [];

    for (const word of words) {
      const target = isReviewCandidate(word.srs) ? reviewWords : newWords;
      target.push(this.toLearningProgress(word));
    }

    return {
      reviewWords,
      newWords,
      totalCount: reviewWords.length + newWords.length,
      severity
    };
  }

  private calculateNextReviewDate(reviewCount: number, from: Date): string {
    const index = Math.max(0, Math.min(reviewCount - 1, REVIEW_INTERVALS_DAYS.length - 1));
    const intervalDays =
      reviewCount > REVIEW_INTERVALS_DAYS.length ? MASTER_INTERVAL_DAYS : REVIEW_INTERVALS_DAYS[index];
    const next = new Date(from);
    next.setDate(next.getDate() + intervalDays);
    return toDateKey(next);
  }

  private calculateNextAllowedTime(reviewCount: number, from: Date): string {
    const index = Math.max(0, reviewCount - 1);
    const delayMinutes =
      index < EXPOSURE_DELAYS_MINUTES.length
        ? EXPOSURE_DELAYS_MINUTES[index]
        : MASTER_EXPOSURE_DELAY_MINUTES;
    const next = new Date(from.getTime() + delayMinutes * 60_000);
    return next.toISOString();
  }

  private buildPayloadFromWord(
    word: TodayWord,
    reviewCount: number,
    status: LearningProgress['status'],
    nextReviewIso: string | null,
    nextAllowedIso: string,
    nowIso: string
  ): LearnedWordUpsert {
    const learnedAtIso = word.srs?.learned_at ?? nowIso;

    const payload: LearnedWordUpsert = {
      in_review_queue: shouldRemainInQueue(status),
      review_count: reviewCount,
      learned_at: learnedAtIso,
      last_review_at: nowIso,
      next_review_at: nextReviewIso,
      next_display_at: nextAllowedIso,
      last_seen_at: nowIso,
      srs_interval_days: computeIntervalDays(learnedAtIso, nextReviewIso ?? undefined),
      srs_easiness: word.srs?.srs_easiness ?? 2.5,
      srs_state: toSrsState(status)
    };

    return payload;
  }

  private applyReviewToWord(word: TodayWord): { updated: TodayWord; payload: LearnedWordUpsert; progress: LearningProgress } {
    const now = new Date();
    const reviewCount = (word.srs?.review_count ?? 0) + 1;
    const nextReviewDateKey = this.calculateNextReviewDate(reviewCount, now);
    const nextReviewIso = toIsoDate(nextReviewDateKey);
    const nextAllowedTime = this.calculateNextAllowedTime(reviewCount, now);
    const nowIso = now.toISOString();

    const status = determineStatus(reviewCount, nextReviewIso ?? '', true);
    const payload = this.buildPayloadFromWord(word, reviewCount, status, nextReviewIso, nextAllowedTime, nowIso);

    const updated: TodayWord = {
      ...word,
      nextAllowedTime,
      srs: {
        in_review_queue: payload.in_review_queue,
        review_count: reviewCount,
        learned_at: payload.learned_at,
        last_review_at: payload.last_review_at,
        next_review_at: payload.next_review_at,
        next_display_at: payload.next_display_at,
        last_seen_at: payload.last_seen_at,
        srs_interval_days: payload.srs_interval_days,
        srs_easiness: payload.srs_easiness,
        srs_state: payload.srs_state
      }
    };

    return { updated, payload, progress: this.toLearningProgress(updated) };
  }

  async prepareUserSession(): Promise<string | null> {
    const userKey = await ensureUserKey();
    if (!userKey) return null;
    this.clearStaleCaches(userKey);
    return userKey;
  }

  async getTodayWords(
    userKey: string,
    severity: SeverityLevel,
    { refresh } = { refresh: false }
  ): Promise<DailyWordsResult> {
    if (!userKey) throw new Error('userKey is required');
    const cache = this.loadTodayWords(userKey);
    if (!refresh && cache.length > 0) {
      return {
        words: cache,
        selection: this.buildSelection(cache, severity)
      };
    }

    const count = this.resolveCount(severity);
    const words = await this.requestDailySelectionFromServer(userKey, severity, count);
    this.saveTodayWords(userKey, words);

    return {
      words,
      selection: this.buildSelection(words, severity)
    };
  }

  async regenerateTodayWords(userKey: string, severity: SeverityLevel): Promise<DailyWordsResult> {
    this.clearTodayWordsForUser(userKey);
    return this.getTodayWords(userKey, severity, { refresh: true });
  }

  async markWordReviewed(
    userKey: string,
    wordId: string,
    severity: SeverityLevel
  ): Promise<{
    words: TodayWord[];
    selection: DailySelection;
    payload: LearnedWordUpsert;
    progress: LearningProgress;
    summary: ProgressSummaryFields | null;
  }> {
    const cache = this.loadTodayWords(userKey);
    const index = cache.findIndex(entry => entry.word_id === wordId);
    if (index === -1) {
      throw new Error('Word not found in today cache');
    }

    const { updated, payload, progress } = this.applyReviewToWord(cache[index]);
    cache[index] = updated;
    this.saveTodayWords(userKey, cache);

    const summary = await markLearnedServerByKey(wordId, payload);

    return {
      words: cache,
      selection: this.buildSelection(cache, severity),
      payload,
      progress,
      summary
    };
  }

  async markWordAsNew(userKey: string, wordId: string): Promise<TodayWord[]>
  {
    const cache = this.loadTodayWords(userKey);
    const index = cache.findIndex(entry => entry.word_id === wordId);
    if (index === -1) return cache;

    const base = cache[index];
    const resetWord: TodayWord = {
      ...base,
      nextAllowedTime: undefined,
      srs: {
        in_review_queue: false,
        review_count: 0,
        learned_at: null,
        last_review_at: null,
        next_review_at: null,
        next_display_at: null,
        last_seen_at: null,
        srs_interval_days: null,
        srs_easiness: base.srs?.srs_easiness ?? 2.5,
        srs_state: 'new'
      }
    };

    cache[index] = resetWord;
    this.saveTodayWords(userKey, cache);
    await resetLearned(wordId);
    return cache;
  }

  async fetchProgressSummary(userKey: string): Promise<ProgressSummaryFields | null> {
    return getProgressSummary(userKey);
  }

  async fetchLearnedWordSummaries(userKey: string): Promise<{
    word: string;
    category?: string;
    learnedDate?: string;
  }[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    if (CUSTOM_AUTH_MODE) return [];

    const { data, error } = await client
      .from('learned_words')
      .select('word_id,learned_at')
      .eq('user_unique_key', userKey)
      .order('learned_at', { ascending: false });

    if (error) {
      console.warn('[LearningProgressService] Failed to fetch learned words', error.message);
      return [];
    }

    return (Array.isArray(data) ? data : []).map(row => {
      const wordId = typeof row?.word_id === 'string' ? row.word_id : '';
      const [word, category] = wordId.split('::');
      return {
        word: word || wordId,
        category: category || undefined,
        learnedDate: typeof row?.learned_at === 'string' ? row.learned_at : undefined
      };
    });
  }
}

export const learningProgressService = LearningProgressService.getInstance();
