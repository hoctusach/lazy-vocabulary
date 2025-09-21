import type { LearnedWord } from '@/core/models';
import type { VocabularyWord } from '@/types/vocabulary';
import type {
  DailySelection,
  LearningProgress,
  SeverityConfig,
  SeverityLevel
} from '@/types/learning';
import { getLearned, resetLearned, upsertLearned, type LearnedWordUpsert } from '@/lib/db/learned';
import { TOTAL_WORDS } from '@/lib/progress/srsSyncByUserKey';
import { toWordId } from '@/lib/words/ids';
import {
  DAILY_SELECTION_KEY,
  LAST_SYNC_DATE_KEY,
  LEARNING_PROGRESS_KEY,
  TODAY_WORDS_KEY
} from '@/utils/storageKeys';
import {
  calculateNextIntervalDays,
  addIntervalDays,
  SRS_FIXED_INTERVALS_DAYS,
} from '@/lib/progress/srsIntervals';
import { getActiveSession } from '@/lib/auth';

const DEFAULT_SEVERITY_CONFIG: SeverityConfig = {
  light: { min: 15, max: 25 },
  moderate: { min: 30, max: 50 },
  intense: { min: 50, max: 100 }
};

const REVIEW_INTERVALS_DAYS = Array.from(SRS_FIXED_INTERVALS_DAYS);
const EXPOSURE_DELAYS_MINUTES = [0, 5, 7, 10, 15, 30, 60, 90, 120];
const MASTER_EXPOSURE_DELAY_MINUTES = 180;

type StoredProgress = Partial<LearningProgress> & {
  word?: string;
  category?: string;
};

export class LearningProgressService {
  private readonly severityConfig: SeverityConfig = DEFAULT_SEVERITY_CONFIG;
  private readonly serverLearnedWordCache = new Map<string, LearnedWord>();
  private loadingServerCache: Promise<void> | null = null;

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

  private getTodayKey(): string {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }

  private getSelectionStorageKey(date: string): string {
    return `${DAILY_SELECTION_KEY}:${date}`;
  }

  private normaliseWordId(wordId: string | undefined | null): string {
    if (typeof wordId !== 'string') return '';
    return wordId.trim().toLowerCase();
  }

  private normaliseWordIdList(values: unknown[]): string[] {
    const ids: string[] = [];
    for (const value of values) {
      if (typeof value === 'string') {
        const normalised = this.normaliseWordId(value);
        if (normalised) ids.push(normalised);
        continue;
      }

      if (value && typeof value === 'object') {
        const candidate = (value as { word_id?: unknown; id?: unknown }).word_id ??
          (value as { id?: unknown }).id;
        if (typeof candidate === 'string') {
          const normalised = this.normaliseWordId(candidate);
          if (normalised) ids.push(normalised);
        }
      }
    }

    return Array.from(new Set(ids));
  }

  private parseCachedWordIds(raw: string | null): string[] {
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return this.normaliseWordIdList(parsed);
      }

      if (parsed && typeof parsed === 'object') {
        const withIds = parsed as { dueWordIds?: unknown; words?: unknown };
        if (Array.isArray(withIds.dueWordIds)) {
          return this.normaliseWordIdList(withIds.dueWordIds);
        }
        if (Array.isArray(withIds.words)) {
          return this.normaliseWordIdList(withIds.words);
        }
      }
    } catch (error) {
      console.warn('[LearningProgressService] Failed to parse cached due words', error);
    }

    return [];
  }

  private getCachedServerDueWordSet(date: string): Set<string> {
    const storage = this.getStorage();
    if (!storage) return new Set();

    const lastSync = storage.getItem(LAST_SYNC_DATE_KEY);
    if (!lastSync || lastSync !== date) {
      return new Set();
    }

    const ids = this.parseCachedWordIds(storage.getItem(TODAY_WORDS_KEY));
    return new Set(ids);
  }

  private persistServerDueWordIds(date: string, wordIds: string[]): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      const unique = Array.from(new Set(wordIds.map(id => this.normaliseWordId(id)).filter(Boolean)));
      storage.setItem(TODAY_WORDS_KEY, JSON.stringify(unique));
      storage.setItem(LAST_SYNC_DATE_KEY, date);
    } catch (error) {
      console.warn('[LearningProgressService] Failed to persist server due words', error);
    }
  }

  private updateServerCacheFromRows(rows: LearnedWord[], replace = false): void {
    if (!Array.isArray(rows)) return;
    if (replace) {
      this.serverLearnedWordCache.clear();
    }

    for (const row of rows) {
      if (!row) continue;
      const key = this.normaliseWordId(row.word_id);
      if (!key) continue;
      this.serverLearnedWordCache.set(key, { ...row, word_id: row.word_id });
    }
  }

  private updateServerCacheEntry(wordId: string, updates: Partial<LearnedWord>): void {
    const key = this.normaliseWordId(wordId);
    if (!key) return;
    const existing = this.serverLearnedWordCache.get(key) ?? { word_id: wordId, in_review_queue: false };
    const merged: LearnedWord = {
      ...existing,
      ...updates,
      word_id: updates.word_id ?? existing.word_id ?? wordId,
    };
    this.serverLearnedWordCache.set(key, merged);
  }

  private removeServerCacheEntry(wordId: string): void {
    const key = this.normaliseWordId(wordId);
    if (!key) return;
    this.serverLearnedWordCache.delete(key);
  }

  private async ensureServerCache(): Promise<void> {
    if (this.serverLearnedWordCache.size > 0) return;
    if (this.loadingServerCache) {
      try {
        await this.loadingServerCache;
      } catch {
        // ignore cache load failures, caller will retry later
      }
      return;
    }

    this.loadingServerCache = (async () => {
      try {
        const rows = await getLearned();
        this.updateServerCacheFromRows(rows, true);
      } catch (error) {
        console.warn('[LearningProgressService] Failed to warm server cache', error);
      }
    })();

    try {
      await this.loadingServerCache;
    } finally {
      this.loadingServerCache = null;
    }
  }

  private isInReviewQueue(value: unknown): boolean {
    if (value === true) return true;
    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0;
    }
    if (typeof value === 'string') {
      const normalised = value.trim().toLowerCase();
      return normalised === 'true' || normalised === '1' || normalised === 'yes';
    }
    return false;
  }

  private buildWordKey(word: string, category?: string): string {
    return category ? `${word}::${category}` : word;
  }

  private loadProgressMap(): Record<string, StoredProgress> {
    const storage = this.getStorage();
    if (!storage) return {};

    try {
      const raw = storage.getItem(LEARNING_PROGRESS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const map: Record<string, StoredProgress> = {};
        for (const entry of parsed) {
          if (entry && typeof entry === 'object') {
            const progress = entry as StoredProgress;
            const key = this.buildWordKey(progress.word ?? '', progress.category);
            if (key.trim()) map[key] = progress;
          }
        }
        return map;
      }
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, StoredProgress>;
      }
    } catch (error) {
      console.warn('[LearningProgressService] Failed to parse learning progress', error);
    }

    return {};
  }

  private saveProgressMap(progressMap: Record<string, StoredProgress>): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(progressMap));
    } catch (error) {
      console.warn('[LearningProgressService] Failed to persist learning progress', error);
    }
  }

  private parseWordKey(wordKey: string): { word: string; category?: string } {
    const trimmed = (wordKey ?? '').trim();
    if (!trimmed) {
      return { word: '' };
    }

    const parts = trimmed.split('::');
    if (parts.length >= 2) {
      const [word, ...categoryParts] = parts;
      const category = categoryParts.join('::').trim();
      return { word: word.trim(), category: category || undefined };
    }

    return { word: trimmed };
  }

  private resolveProgressEntry(
    progressMap: Record<string, StoredProgress>,
    wordKey: string
  ): {
    key?: string;
    entry?: StoredProgress;
    word: string;
    category?: string;
  } {
    const parsed = this.parseWordKey(wordKey);
    let word = parsed.word;
    const category = parsed.category;
    const candidates = new Set<string>();

    const trimmedKey = (wordKey ?? '').trim();
    if (trimmedKey) candidates.add(trimmedKey);

    const builtKey = this.buildWordKey(parsed.word, parsed.category);
    if (builtKey) candidates.add(builtKey);

    if (parsed.word) candidates.add(parsed.word);

    for (const candidate of candidates) {
      if (!candidate) continue;
      const entry = progressMap[candidate];
      if (!entry) continue;
      return {
        key: candidate,
        entry,
        word: typeof entry.word === 'string' && entry.word.trim() ? entry.word : word,
        category: entry.category ?? category
      };
    }

    for (const [key, entry] of Object.entries(progressMap)) {
      if (!entry) continue;
      const storedWord = typeof entry.word === 'string' ? entry.word : '';
      if (storedWord && (storedWord === parsed.word || storedWord === trimmedKey)) {
        return {
          key,
          entry,
          word: storedWord,
          category: entry.category ?? category
        };
      }
    }

    if (!word && trimmedKey) {
      word = trimmedKey;
    }

    return {
      key: builtKey || trimmedKey || word,
      word,
      category
    };
  }

  private coerceReviewCount(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toIsoString(value?: string | Date | null): string {
    if (!value) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return new Date().toISOString();
    return new Date(parsed).toISOString();
  }

  private toIsoFromDateKey(value?: string | null): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const candidate = `${trimmed}T00:00:00.000Z`;
    const parsed = Date.parse(candidate);
    if (Number.isNaN(parsed)) return undefined;
    return new Date(parsed).toISOString();
  }

  private toSrsState(status?: StoredProgress['status']): string {
    if (status === 'learned') {
      return 'Learned';
    }
    return 'Learning';
  }

  private isInReviewQueueStatus(status?: StoredProgress['status']): boolean {
    if (!status) return false;
    if (status === 'learned') return false;
    if (status === 'new') return false;
    return true;
  }

  private buildSupabasePayload(
    word: string,
    category: string | undefined,
    progress: StoredProgress
  ): { wordId: string; payload: LearnedWordUpsert } {
    const reviewCount = Math.max(0, Math.trunc(this.coerceReviewCount(progress.reviewCount)));
    const learnedAt = this.toIsoString(progress.learnedDate ?? progress.createdDate);
    const lastReviewAt = this.toIsoString(progress.lastPlayedDate ?? learnedAt);
    const nextReviewAt = this.toIsoFromDateKey(progress.nextReviewDate);
    const intervalDays = reviewCount > 0 ? calculateNextIntervalDays(reviewCount) : null;
    const srsState = this.toSrsState(progress.status);
    const wordId = toWordId(word, category);

    const payload: LearnedWordUpsert = {
      in_review_queue: this.isInReviewQueueStatus(progress.status),
      review_count: reviewCount,
      learned_at: learnedAt,
      last_review_at: lastReviewAt,
      next_review_at: nextReviewAt ?? null,
      next_display_at: nextReviewAt ?? null,
      last_seen_at: lastReviewAt,
      srs_interval_days: intervalDays,
      srs_easiness: 2.5,
      srs_state: srsState,
    };

    return { wordId, payload };
  }

  private async persistProgressToCloud(
    word: string,
    category: string | undefined,
    progress: StoredProgress
  ): Promise<{ wordId: string; payload: LearnedWordUpsert } | null> {
    try {
      const built = this.buildSupabasePayload(word, category, progress);
      await upsertLearned(built.wordId, built.payload);
      this.updateServerCacheEntry(built.wordId, {
        word_id: built.wordId,
        in_review_queue: built.payload.in_review_queue,
        review_count: built.payload.review_count ?? null,
        learned_at: built.payload.learned_at ?? null,
        last_review_at: built.payload.last_review_at ?? null,
        next_review_at: built.payload.next_review_at ?? null,
        next_display_at: built.payload.next_display_at ?? null,
        last_seen_at: built.payload.last_seen_at ?? null,
        srs_interval_days: built.payload.srs_interval_days ?? null,
        srs_easiness: built.payload.srs_easiness ?? null,
        srs_state: built.payload.srs_state ?? null,
      });
      return built;
    } catch (error) {
      console.warn('[LearningProgressService] Failed to sync learned word', error);
      return null;
    }
  }

  private calculateNextReviewDate(reviewCount: number, from: Date): string {
    const safeCount = Math.max(1, reviewCount);
    const intervalDays = calculateNextIntervalDays(safeCount);
    const next = new Date(from);
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + intervalDays);
    return next.toISOString().slice(0, 10);
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

  private determineStatus(
    reviewCount: number,
    nextReviewDate: string,
    isLearned: boolean
  ): LearningProgress['status'] {
    if (!isLearned || reviewCount === 0) {
      return 'new';
    }

    const due = this.isDue({ nextReviewDate } as StoredProgress);
    if (due) {
      return 'due';
    }

    if (reviewCount >= REVIEW_INTERVALS_DAYS.length + 1) {
      return 'learned';
    }

    return 'not_due';
  }

  private assignProgressEntry(
    progressMap: Record<string, StoredProgress>,
    preferredKey: string | undefined,
    progress: StoredProgress
  ): void {
    const key = (preferredKey ?? '').trim() || this.buildWordKey(progress.word ?? '', progress.category);
    if (!key) return;

    progressMap[key] = progress;

    const { word, category } = progress;
    if (!word) return;

    for (const existingKey of Object.keys(progressMap)) {
      if (existingKey === key) continue;
      const entry = progressMap[existingKey];
      if (!entry) continue;
      if (entry.word !== word) continue;
      if (category && entry.category && entry.category !== category) continue;
      if (!category && entry.category) continue;
      delete progressMap[existingKey];
    }
  }

  private normaliseProgress(
    word: VocabularyWord,
    stored?: StoredProgress
  ): LearningProgress {
    const today = this.getTodayKey();
    const category = stored?.category ?? word.category ?? 'general';
    const status = stored?.status ?? (stored?.isLearned ? 'not_due' : 'new');

    return {
      word: stored?.word ?? word.word,
      type: stored?.type,
      category,
      isLearned: stored?.isLearned ?? false,
      reviewCount: stored?.reviewCount ?? 0,
      lastPlayedDate: stored?.lastPlayedDate ?? '',
      status,
      nextReviewDate: stored?.nextReviewDate ?? '',
      createdDate: stored?.createdDate ?? today,
      learnedDate: stored?.learnedDate,
      nextAllowedTime: stored?.nextAllowedTime
    };
  }

  private isDue(stored?: StoredProgress): boolean {
    if (!stored) return false;
    if (stored.status === 'due') return true;

    const candidate = stored.nextReviewDate ?? stored.nextAllowedTime;
    if (!candidate) return false;

    const timestamp = Date.parse(candidate);
    if (Number.isNaN(timestamp)) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return timestamp <= today.getTime();
  }

  private isServerDue(nextDisplayAt?: string | null): boolean {
    if (!nextDisplayAt) return false;
    const parsed = Date.parse(nextDisplayAt);
    if (Number.isNaN(parsed)) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return parsed <= today.getTime();
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed);
  }

  private startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private isSameDayDates(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
  }

  private isLearnedProgress(stored?: StoredProgress): boolean {
    if (!stored) return false;
    if (stored.isLearned === true) return true;

    const rawIsLearned = (stored as Record<string, unknown>).isLearned;
    if (typeof rawIsLearned === 'string') {
      const normalized = rawIsLearned.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
      }
    }

    const status = stored.status;
    if (typeof status === 'string' && status.trim().toLowerCase() === 'learned') {
      return true;
    }

    const rawStatus = (stored as Record<string, unknown>).status;
    if (typeof rawStatus === 'number' && rawStatus >= 3) {
      return true;
    }

    return false;
  }

  private persistSelection(date: string, selection: DailySelection): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.setItem(this.getSelectionStorageKey(date), JSON.stringify(selection));
      storage.setItem(DAILY_SELECTION_KEY, JSON.stringify(selection));
    } catch (error) {
      console.warn('[LearningProgressService] Failed to persist daily selection', error);
    }
  }

  private getStoredProgress(
    progressMap: Record<string, StoredProgress>,
    word: VocabularyWord
  ): StoredProgress | undefined {
    const primary = this.buildWordKey(word.word, word.category);
    return progressMap[primary] ?? progressMap[word.word];
  }

  async getLearnedWords(): Promise<{ word: string }[]> {
    const rows = await getLearned();
    this.updateServerCacheFromRows(rows as LearnedWord[], true);
    return rows.map(r => ({ word: r.word_id }));
  }

  async markWordLearned(wordKey: string): Promise<{ wordId: string; payload: LearnedWordUpsert } | null> {
    const progressMap = this.loadProgressMap();
    const resolved = this.resolveProgressEntry(progressMap, wordKey);
    if (!resolved.word) return null;

    const now = new Date();
    const todayKey = this.getTodayKey();
    const learnedAt = now.toISOString();

    const category = resolved.category ?? resolved.entry?.category;

    const updated: StoredProgress = {
      ...resolved.entry,
      word: resolved.word,
      category,
      isLearned: true,
      reviewCount: this.coerceReviewCount(resolved.entry?.reviewCount),
      lastPlayedDate: resolved.entry?.lastPlayedDate ?? learnedAt,
      status: 'learned',
      nextReviewDate: '',
      createdDate: resolved.entry?.createdDate ?? todayKey,
      learnedDate: resolved.entry?.learnedDate ?? learnedAt,
      nextAllowedTime: undefined
    };

    this.assignProgressEntry(progressMap, resolved.key, updated);
    this.saveProgressMap(progressMap);
    return this.persistProgressToCloud(resolved.word, category, updated);
  }

  markWordAsNew(wordKey: string): void {
    const progressMap = this.loadProgressMap();
    const resolved = this.resolveProgressEntry(progressMap, wordKey);
    if (!resolved.word) return;

    const todayKey = this.getTodayKey();

    const category = resolved.category ?? resolved.entry?.category;

    const updated: StoredProgress = {
      ...resolved.entry,
      word: resolved.word,
      category,
      isLearned: false,
      reviewCount: 0,
      lastPlayedDate: '',
      status: 'new',
      nextReviewDate: '',
      createdDate: resolved.entry?.createdDate ?? todayKey,
      learnedDate: undefined,
      nextAllowedTime: undefined
    };

    this.assignProgressEntry(progressMap, resolved.key, updated);
    this.saveProgressMap(progressMap);

    const wordId = toWordId(resolved.word, category);
    if (wordId) {
      void resetLearned(wordId);
      this.removeServerCacheEntry(wordId);
    }
  }

  getProgressStats() {
    const progressMap = this.loadProgressMap();
    let learning = 0;
    let learned = 0;
    let due = 0;
    let newCount = 0;

    for (const stored of Object.values(progressMap)) {
      if (!stored) continue;

      if (this.isLearnedProgress(stored)) {
        learned += 1;
        if (this.isDue(stored)) {
          due += 1;
        }
        continue;
      }

      const rawReviewCount =
        typeof stored.reviewCount === 'number'
          ? stored.reviewCount
          : Number(stored.reviewCount ?? 0);
      const reviewCount = Number.isNaN(rawReviewCount) ? 0 : rawReviewCount;
      const lastPlayedDate = stored.lastPlayedDate ?? '';

      if (
        stored.status === 'new' ||
        (reviewCount === 0 && !lastPlayedDate)
      ) {
        newCount += 1;
      } else {
        learning += 1;
      }
    }

    const total = TOTAL_WORDS;
    const accounted = learning + learned + newCount;
    if (accounted < total) {
      newCount += total - accounted;
    }

    return {
      total,
      learning,
      new: newCount,
      due,
      learned
    };
  }

  updateWordProgress(wordKey: string): void {
    const progressMap = this.loadProgressMap();
    const resolved = this.resolveProgressEntry(progressMap, wordKey);
    if (!resolved.word) return;

    const now = new Date();
    const todayKey = this.getTodayKey();
    const existing = resolved.entry;
    const category = resolved.category ?? existing?.category;
    const previousCount = this.coerceReviewCount(existing?.reviewCount);
    const reviewCount = previousCount + 1;
    const nextReviewDate = this.calculateNextReviewDate(reviewCount, now);
    const nextAllowedTime = this.calculateNextAllowedTime(reviewCount, now);
    const learnedDate =
      typeof existing?.learnedDate === 'string' && existing.learnedDate.trim()
        ? existing.learnedDate
        : now.toISOString();
    const isLearned = true;
    const status = this.determineStatus(reviewCount, nextReviewDate, isLearned);

    const updated: StoredProgress = {
      ...existing,
      word: resolved.word,
      category,
      isLearned,
      reviewCount,
      lastPlayedDate: now.toISOString(),
      status,
      nextReviewDate,
      createdDate: existing?.createdDate ?? todayKey,
      learnedDate,
      nextAllowedTime
    };

    this.assignProgressEntry(progressMap, resolved.key, updated);
    this.saveProgressMap(progressMap);
    void this.persistProgressToCloud(resolved.word, category, updated);
  }

  getWordProgress(wordKey: string): LearningProgress | undefined {
    const progressMap = this.loadProgressMap();
    const resolved = this.resolveProgressEntry(progressMap, wordKey);
    if (!resolved.entry || !resolved.word) return undefined;

    const baseWord: VocabularyWord = {
      word: resolved.entry.word ?? resolved.word,
      meaning: '',
      example: '',
      category: resolved.entry.category ?? resolved.category ?? 'general'
    };

    return this.normaliseProgress(baseWord, resolved.entry);
  }

  async syncServerDueWords(): Promise<string[]> {
    const storage = this.getStorage();
    if (!storage) return [];

    const todayKey = this.getTodayKey();
    const lastSync = storage.getItem(LAST_SYNC_DATE_KEY);
    if (lastSync === todayKey) {
      return Array.from(this.getCachedServerDueWordSet(todayKey));
    }

    try {
      const rows = await getLearned();
      this.updateServerCacheFromRows(rows as LearnedWord[], true);
      const dueIds = new Set<string>();

      for (const row of rows ?? []) {
        if (!row || typeof row !== 'object') continue;

        const typed = row as LearnedWord;
        const inQueue = this.isInReviewQueue(typed.in_review_queue);
        if (!inQueue) continue;

        const due = this.isServerDue(
          typeof typed.next_display_at === 'string' ? typed.next_display_at : undefined
        );
        if (!due) continue;

        const wordIdValue = (typed as { word_id?: unknown }).word_id;
        if (typeof wordIdValue !== 'string') continue;

        const normalised = this.normaliseWordId(wordIdValue);
        if (!normalised) continue;

        dueIds.add(normalised);
      }

      const result = Array.from(dueIds);
      this.persistServerDueWordIds(todayKey, result);
      return result;
    } catch (error) {
      console.warn('[LearningProgressService] Failed to sync due words from Supabase', error);
      return Array.from(this.getCachedServerDueWordSet(todayKey));
    }
  }

  private async syncSelectionWithServer(selection: DailySelection | null): Promise<void> {
    if (!selection) return;

    const session = await getActiveSession();
    if (!session?.user_unique_key) return;

    try {
      await this.ensureServerCache();
    } catch {
      // ignore cache warm-up errors
    }

    const entries = [...selection.reviewWords, ...selection.newWords];
    if (!entries.length) return;

    const now = new Date();
    const todayStart = this.startOfDay(now);
    const seen = new Set<string>();
    const tasks: Promise<void>[] = [];

    for (const progress of entries) {
      const wordId = toWordId(progress.word, progress.category);
      if (!wordId) continue;

      const cacheKey = this.normaliseWordId(wordId);
      if (!cacheKey || seen.has(cacheKey)) continue;
      seen.add(cacheKey);

      const existing = this.serverLearnedWordCache.get(cacheKey);
      const existingState = (existing?.srs_state ?? '').toLowerCase();
      const isGraduated = existingState === 'learned' || existingState === 'graduated';

      let reviewCount =
        typeof existing?.review_count === 'number' && Number.isFinite(existing.review_count)
          ? Math.max(0, Math.trunc(existing.review_count))
          : 0;

      const lastSeen = this.parseDate(existing?.last_seen_at ?? null);
      const seenToday = this.isSameDayDates(lastSeen, now);

      let intervalDays =
        typeof existing?.srs_interval_days === 'number' && Number.isFinite(existing.srs_interval_days)
          ? Math.max(1, Math.trunc(existing.srs_interval_days))
          : null;

      let nextDisplayDate = existing?.next_display_at ? this.parseDate(existing.next_display_at) : null;

      if (!seenToday && !isGraduated) {
        reviewCount = reviewCount + 1 || 1;
        intervalDays = calculateNextIntervalDays(reviewCount, intervalDays ?? undefined);
        nextDisplayDate = addIntervalDays(todayStart, intervalDays);
      } else {
        if (!intervalDays && reviewCount > 0) {
          intervalDays = calculateNextIntervalDays(reviewCount, intervalDays ?? undefined);
        }
        if (!nextDisplayDate && intervalDays) {
          nextDisplayDate = addIntervalDays(todayStart, intervalDays);
        }
      }

      const lastSeenIso = now.toISOString();
      const nextDisplayIso = nextDisplayDate ? this.startOfDay(nextDisplayDate).toISOString() : null;
      const inReviewQueue = isGraduated ? false : true;
      const srsState = isGraduated ? existing?.srs_state ?? 'Learned' : 'Learning';

      const payload: LearnedWordUpsert = {
        in_review_queue: inReviewQueue,
        review_count: reviewCount,
        learned_at: existing?.learned_at ?? lastSeenIso,
        last_review_at: lastSeenIso,
        next_review_at: nextDisplayIso,
        next_display_at: nextDisplayIso,
        last_seen_at: lastSeenIso,
        srs_interval_days: intervalDays ?? null,
        srs_state: srsState,
      };

      tasks.push(
        upsertLearned(wordId, payload)
          .then(() => {
            this.updateServerCacheEntry(wordId, {
              word_id: wordId,
              in_review_queue: payload.in_review_queue,
              review_count: payload.review_count ?? null,
              learned_at: payload.learned_at ?? null,
              last_review_at: payload.last_review_at ?? null,
              next_review_at: payload.next_review_at ?? null,
              next_display_at: payload.next_display_at ?? null,
              last_seen_at: payload.last_seen_at ?? null,
              srs_interval_days: payload.srs_interval_days ?? null,
              srs_state: payload.srs_state ?? null,
            });
          })
          .catch(error => {
            console.warn('[LearningProgressService] Failed to sync daily selection word', error);
          })
      );
    }

    if (tasks.length > 0) {
      try {
        await Promise.all(tasks);
      } catch {
        // errors already logged per task
      }
    }
  }

  forceGenerateDailySelection(
    words: VocabularyWord[],
    severity: SeverityLevel = 'light'
  ): DailySelection {
    const severityKey: SeverityLevel = this.severityConfig[severity]
      ? severity
      : 'light';
    const config = this.severityConfig[severityKey];
    const todayKey = this.getTodayKey();
    const progressMap = this.loadProgressMap();
    const serverDueSet = this.getCachedServerDueWordSet(todayKey);

    const reviewCandidates: LearningProgress[] = [];
    const newCandidates: LearningProgress[] = [];

    for (const word of words) {
      const stored = this.getStoredProgress(progressMap, word);
      const wordId = this.normaliseWordId(toWordId(word.word, word.category));
      const isServerDue = serverDueSet.has(wordId);

      if (stored) {
        const normalised = this.normaliseProgress(word, stored);
        if (isServerDue || this.isDue(stored)) {
          normalised.status = 'due';
          reviewCandidates.push(normalised);
          if (isServerDue) {
            serverDueSet.delete(wordId);
          }
          continue;
        }

        if (!stored.isLearned) {
          normalised.status = 'new';
          newCandidates.push(normalised);
        }
        continue;
      }

      if (isServerDue) {
        const nowIso = new Date().toISOString();
        const normalised = this.normaliseProgress(word, {
          word: word.word,
          category: word.category,
          isLearned: true,
          status: 'due',
          reviewCount: 1,
          nextReviewDate: todayKey,
          lastPlayedDate: nowIso,
          nextAllowedTime: nowIso
        });
        normalised.status = 'due';
        reviewCandidates.push(normalised);
        serverDueSet.delete(wordId);
        continue;
      }

      newCandidates.push(this.normaliseProgress(word));
    }

    reviewCandidates.sort((a, b) => {
      const aTime = a.nextReviewDate ? Date.parse(a.nextReviewDate) : Number.POSITIVE_INFINITY;
      const bTime = b.nextReviewDate ? Date.parse(b.nextReviewDate) : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });

    const available = reviewCandidates.length + newCandidates.length;
    const maxTarget = Math.min(config.max, available);
    const target = available >= config.min ? maxTarget : available;

    const reviewWords = reviewCandidates.slice(0, Math.min(reviewCandidates.length, target));
    const remaining = Math.max(0, target - reviewWords.length);
    const newWords = newCandidates.slice(0, remaining);
    const totalCount = reviewWords.length + newWords.length;

    const selection: DailySelection = {
      newWords,
      reviewWords,
      totalCount,
      severity: severityKey
    };

    this.persistSelection(todayKey, selection);
    void this.syncSelectionWithServer(selection);

    return selection;
  }

  getTodaySelection(): DailySelection | null {
    const storage = this.getStorage();
    if (!storage) return null;

    const todayKey = this.getTodayKey();
    const keysToTry = [this.getSelectionStorageKey(todayKey), DAILY_SELECTION_KEY];

    for (const key of keysToTry) {
      const raw = storage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as DailySelection | { selection?: DailySelection };
        if (parsed && typeof parsed === 'object') {
          if ('newWords' in parsed && 'reviewWords' in parsed) {
            return parsed as DailySelection;
          }
          if ('selection' in parsed && parsed.selection) {
            return parsed.selection as DailySelection;
          }
        }
      } catch (error) {
        console.warn('[LearningProgressService] Failed to parse cached daily selection', error);
      }
    }

    return null;
  }
}

export const learningProgressService = LearningProgressService.getInstance();
