import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  applyTheme,
  detectThemeReset,
  FREE_THEME,
  getActiveTheme,
  getDefaultTheme,
  normalizeTheme,
  takeThemeResetNotice,
  type ThemeName,
} from "@/lib/themeManager";
import { hasFeature, subscribeProFeatures } from "@/services/billing/proFeatures";
import { openProUpgrade } from "@/services/billing/proUpgradeStore";

const RESET_TOAST = "Your theme is now Cozy Sloth — other themes are part of Pro.";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleDark: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const DARK_STORAGE_KEY = "lv-dark";

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => getActiveTheme());
  const [isDark, setIsDark] = useState(false);

  // One-time gentle notice when a non-Pro user was moved to Cozy Sloth (queued by initTheme / the lapse handler).
  useEffect(() => {
    if (takeThemeResetNotice()) toast(RESET_TOAST);
  }, []);

  // Pro lapsed (refund): fall back to the free theme. Purchase/restore needs nothing: the stored choice is free to change.
  useEffect(
    () =>
      subscribeProFeatures(() => {
        if (hasFeature("allThemes")) return;
        detectThemeReset();
        setThemeState((current) => (current === FREE_THEME ? current : FREE_THEME));
        if (takeThemeResetNotice()) toast(RESET_TOAST);
      }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let savedDark: string | null = null;
    try {
      savedDark = localStorage.getItem(DARK_STORAGE_KEY);
    } catch {
      /* blocked storage: use defaults instead of crashing the whole app */
    }
    if (savedDark !== null) {
      setIsDark(savedDark === "true");
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    applyTheme(theme);
    const themeKey = `${theme}${isDark ? "-dark" : ""}`;
    document.documentElement.setAttribute("data-theme", themeKey);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem(DARK_STORAGE_KEY, String(isDark));
    } catch {
      /* blocked or full storage: the theme just will not persist */
    }
  }, [theme, isDark]);

  const setTheme = useCallback((next: ThemeName) => {
    const normalized = normalizeTheme(next);
    if (normalized !== FREE_THEME && !hasFeature("allThemes")) {
      openProUpgrade("allThemes");
      return;
    }
    applyTheme(normalized);
    setThemeState(normalized);
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleDark,
      isDark
    }),
    [theme, setTheme, toggleDark, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

/** Like useTheme but returns the default (notes, light) outside a provider, for purely decorative consumers. */
export const useThemeOptional = (): Pick<ThemeContextValue, "theme" | "isDark"> => {
  const context = useContext(ThemeContext);
  return context ?? { theme: getDefaultTheme(), isDark: false };
};
