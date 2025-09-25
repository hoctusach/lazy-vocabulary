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
  is_due: boolean | null;
};

export async function getDailySelectionV2(
  client: ReturnType<typeof createClient>,
  params: { userKey: string; mode: string; count: number; category?: string | null }
): Promise<DailySelectionV2Row[]> {
  const { data, error } = await client.rpc("generate_daily_selection_v2", {
    p_user_key: params.userKey,
    p_mode: params.mode,
    p_count: params.count,
    p_category: params.category ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (Array.isArray(data) ? data : []).filter(
    (row): row is DailySelectionV2Row => typeof row?.word_id === "string"
  );
}
