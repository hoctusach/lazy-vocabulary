const THEME_KEY = "user-theme";
const DEFAULT_THEME = "mint";

const THEME_CLASS_PREFIX = "theme-";
const AVAILABLE_THEMES = [
  "mint",
  "morning",
  "ocean",
  "sakura",
  "cyber",
  "default",
  "dark",
  "light"
] as const;

const THEME_CLASSES = AVAILABLE_THEMES.map((theme) => `${THEME_CLASS_PREFIX}${theme}`);

type ThemeName = (typeof AVAILABLE_THEMES)[number];

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function normalizeTheme(themeName: string): ThemeName {
  if ((AVAILABLE_THEMES as readonly string[]).includes(themeName)) {
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

  let savedTheme: string | null = null;
  try {
    savedTheme = window.localStorage.getItem(THEME_KEY);
  } catch (error) {
    console.warn("Unable to read persisted theme", error);
  }

  const normalized = normalizeTheme(savedTheme ?? DEFAULT_THEME);
  applyTheme(normalized);
}

export function getActiveTheme(): ThemeName {
  if (!isBrowser()) {
    return DEFAULT_THEME;
  }

  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return normalizeTheme(stored ?? DEFAULT_THEME);
  } catch (error) {
    console.warn("Unable to read persisted theme", error);
    return DEFAULT_THEME;
  }
}

export const userThemes = AVAILABLE_THEMES.slice(0, 5);
