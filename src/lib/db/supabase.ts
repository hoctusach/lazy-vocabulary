import { createClient } from "@supabase/supabase-js";

let hasShownMissingMessage = false;

type DevSupabaseSettings = {
  url?: string;
  anonKey?: string;
};

const DEV_SUPABASE_STORAGE_KEY = "lazyVocabulary.devSupabase";
const DEV_SETTINGS_MODAL_ID = "supabase-dev-settings-modal";

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readDevSupabaseSettings(): DevSupabaseSettings {
  if (!isLocalStorageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(DEV_SUPABASE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { url?: unknown; anonKey?: unknown };
    const url = typeof parsed.url === "string" ? parsed.url.trim() : undefined;
    const anonKey = typeof parsed.anonKey === "string" ? parsed.anonKey.trim() : undefined;
    return { url: url || undefined, anonKey: anonKey || undefined };
  } catch {
    return {};
  }
}

function writeDevSupabaseSettings(settings: DevSupabaseSettings): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.setItem(DEV_SUPABASE_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

function saveDevSupabaseSettings(url: string, anonKey: string): boolean {
  return writeDevSupabaseSettings({ url, anonKey });
}

function clearStoredDevSupabaseSettings(): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(DEV_SUPABASE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function readImportMetaEnv(key: string): string | undefined {
  try {
    const raw = ((import.meta as unknown as { env?: Record<string, unknown> })?.env ?? {})[key];
    if (raw === undefined || raw === null) return undefined;
    return typeof raw === "string" ? raw : String(raw);
  } catch {
    return undefined;
  }
}

function readProcessEnv(key: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[key] : undefined;
}

function showMissingEnvMessage() {
  if (hasShownMissingMessage) return;
  hasShownMissingMessage = true;

  console.error(
    "[Lazy Vocabulary] Supabase URL or anon key is missing. Cloud sync features are disabled until credentials are provided."
  );
}

export function resolveSupabaseConfig() {
  let url = readImportMetaEnv("VITE_SUPABASE_URL") ?? readProcessEnv("NEXT_PUBLIC_SUPABASE_URL");
  let anon =
    readImportMetaEnv("VITE_SUPABASE_ANON_KEY") ?? readProcessEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anon) {
    const devSettings = readDevSupabaseSettings();
    if (!url && devSettings.url) {
      url = devSettings.url;
    }
    if (!anon && devSettings.anonKey) {
      anon = devSettings.anonKey;
    }
  }

  return { url, anon };
}

// 🚀 NEW: Export typed helper to call generate_daily_selection_v2
export type DailySelectionV2Row = {
  word_id: string;
  category: string | null;
  is_today_selection?: boolean | null;
  due_selected_today?: boolean | null;
  new_selected_today?: boolean | null;
  due_candidate_count?: number | null;
  new_candidate_count?: number | null;
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
  word?: string | null;
  meaning?: string | null;
  example?: string | null;
  translation?: string | null;
  learning_count?: number | null;
  learned_count?: number | null;
  learning_due_count?: number | null;
  remaining_count?: number | null;
  v_learned_days?: string[] | null;
} & Record<string, unknown>;

type RawDailySelectionRow = Record<string, unknown>;

function toOptionalString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (["true", "t", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "f", "0", "no", "n"].includes(normalized)) return false;
  }
  return null;
}

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const entries = value
    .map((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        return trimmed.length ? trimmed : null;
      }
      if (typeof entry === "number" && Number.isFinite(entry)) {
        return String(entry);
      }
      if (typeof entry === "bigint") {
        return String(entry);
      }
      return null;
    })
    .filter((entry): entry is string => entry !== null);

  if (entries.length === 0) {
    return [];
  }
  return entries;
}

function normalizeDailySelectionRow(row: RawDailySelectionRow): DailySelectionV2Row | null {
  const rawWordId = toOptionalString(row.word_id) ?? toOptionalString(row.word);
  if (!rawWordId) {
    return null;
  }

  return {
    word_id: rawWordId,
    category: toOptionalString(row.category),
    is_today_selection: toOptionalBoolean(row.is_today_selection),
    due_selected_today: toOptionalBoolean(row.due_selected_today),
    new_selected_today: toOptionalBoolean(row.new_selected_today),
    due_candidate_count: toOptionalNumber(row.due_candidate_count),
    new_candidate_count: toOptionalNumber(row.new_candidate_count),
    in_review_queue: toOptionalBoolean(row.in_review_queue),
    review_count: toOptionalNumber(row.review_count),
    learned_at: toOptionalString(row.learned_at),
    last_review_at: toOptionalString(row.last_review_at),
    next_review_at: toOptionalString(row.next_review_at),
    next_display_at: toOptionalString(row.next_display_at),
    last_seen_at: toOptionalString(row.last_seen_at),
    srs_interval_days: toOptionalNumber(row.srs_interval_days),
    srs_ease: toOptionalNumber(row.srs_ease),
    srs_state: toOptionalString(row.srs_state),
    word: toOptionalString(row.word),
    meaning: toOptionalString(row.meaning),
    example: toOptionalString(row.example),
    translation: toOptionalString(row.translation),
    learning_count: toOptionalNumber(row.learning_count),
    learned_count: toOptionalNumber(row.learned_count),
    learning_due_count: toOptionalNumber(row.learning_due_count),
    remaining_count: toOptionalNumber(row.remaining_count),
    v_learned_days: toStringArray(row.v_learned_days),
  };
}

export async function getDailySelectionV2(
  client: ReturnType<typeof createClient>,
  params: { userKey: string; count: number; category?: string | null }
): Promise<DailySelectionV2Row[]> {
  const { data, error } = await client
    .rpc("generate_daily_selection_v2", {
      p_user_key: params.userKey,
      p_count: params.count,
      p_category: params.category ?? null,
    })
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (Array.isArray(data) ? data : [])
    .map((row) => normalizeDailySelectionRow(row as RawDailySelectionRow))
    .filter((row): row is DailySelectionV2Row => Boolean(row?.word_id));
}
