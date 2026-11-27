import { isProEnabled } from "@/config/features";
import { hasFeature } from "@/services/billing/proFeatures";

const THEME_KEY = "user-theme";
const NOTICE_KEY = "lv-theme-pro-notice";

/** The 5 real style themes (each has a light and a dark variant; dark is html.dark). */
export const THEME_IDS = ["notes", "sloth", "blocks", "pixel", "riso"] as const;
export type ThemeName = (typeof THEME_IDS)[number];
/** The one theme that stays free (Cozy Sloth). */
export const FREE_THEME: ThemeName = "sloth";
/** Today's default (Margin Notes); with the Pro split enabled the default is the free theme. */
export const DEFAULT_THEME: ThemeName = "notes";

export function getDefaultTheme(): ThemeName {
  return isProEnabled() ? FREE_THEME : DEFAULT_THEME;
}

const THEME_CLASS_PREFIX = "theme-";
const THEME_CLASSES = THEME_IDS.map((theme) => `${THEME_CLASS_PREFIX}${theme}`);

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Legacy values (mint/morning/ocean/sakura/cyber/default/dark/light) and anything unknown migrate to the default. */
export function normalizeTheme(themeName: string | null | undefined): ThemeName {
  if (themeName && (THEME_IDS as readonly string[]).includes(themeName)) {
    return themeName as ThemeName;
  }
  return getDefaultTheme();
}

/** What a user may actually see: any theme for Pro (or when the split is off), otherwise Cozy Sloth. */
export function resolveAllowedTheme(theme: ThemeName): ThemeName {
  return hasFeature("allThemes") ? theme : FREE_THEME;
}

export function applyTheme(themeName: string) {
  if (!isBrowser()) {
    return;
  }

  const normalized = resolveAllowedTheme(normalizeTheme(themeName));
  const classList = document.body.classList;

  classList.remove(...THEME_CLASSES);
  classList.add(`${THEME_CLASS_PREFIX}${normalized}`);

  try {
    window.localStorage.setItem(THEME_KEY, normalized);
  } catch (error) {
    console.warn("Unable to persist theme", error);
  }
}

export function initTheme() {
  if (!isBrowser()) {
    return;
  }
  detectThemeReset();
  // applyTheme also rewrites a legacy/unknown stored value as the migrated one.
  applyTheme(getActiveTheme());
}

export function getActiveTheme(): ThemeName {
  if (!isBrowser()) {
    return getDefaultTheme();
  }

  try {
    return resolveAllowedTheme(normalizeTheme(window.localStorage.getItem(THEME_KEY)));
  } catch (error) {
    console.warn("Unable to read persisted theme", error);
    return getDefaultTheme();
  }
}

let pendingResetNotice = false;

/**
 * Call BEFORE the stored theme is overwritten. If a non-Pro user is about to be moved off a stored non-sloth theme
 * (including legacy values that used to map to Margin Notes) and has not been told yet, queue the one-time notice.
 * Fresh installs (nothing stored) never see it.
 */
export function detectThemeReset(): void {
  if (!isBrowser() || !isProEnabled() || hasFeature("allThemes")) return;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === null || stored === FREE_THEME) return;
    if (window.localStorage.getItem(NOTICE_KEY) === "1") return;
    window.localStorage.setItem(NOTICE_KEY, "1");
    pendingResetNotice = true;
  } catch {
    /* storage blocked: skip the notice */
  }
}

/** True once if a reset notice is queued (then clears it). */
export function takeThemeResetNotice(): boolean {
  const v = pendingResetNotice;
  pendingResetNotice = false;
  return v;
}

export const userThemes: readonly ThemeName[] = THEME_IDS;
