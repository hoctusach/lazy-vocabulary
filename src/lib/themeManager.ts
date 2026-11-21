const THEME_KEY = "user-theme";

/** The 5 real style themes (each has a light and a dark variant; dark is html.dark). */
export const THEME_IDS = ["notes", "sloth", "blocks", "pixel", "riso"] as const;
export type ThemeName = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeName = "notes";

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
  return DEFAULT_THEME;
}

export function applyTheme(themeName: string) {
  if (!isBrowser()) {
    return;
  }

  const normalized = normalizeTheme(themeName);
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
  // applyTheme also rewrites a legacy/unknown stored value as the migrated one.
  applyTheme(getActiveTheme());
}

export function getActiveTheme(): ThemeName {
  if (!isBrowser()) {
    return DEFAULT_THEME;
  }

  try {
    return normalizeTheme(window.localStorage.getItem(THEME_KEY));
  } catch (error) {
    console.warn("Unable to read persisted theme", error);
    return DEFAULT_THEME;
  }
}

export const userThemes: readonly ThemeName[] = THEME_IDS;
