import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { applyTheme, getActiveTheme, normalizeTheme, type ThemeName } from "@/lib/themeManager";

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
  return context ?? { theme: "notes", isDark: false };
};
