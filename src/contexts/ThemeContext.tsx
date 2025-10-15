import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction
} from "react";

type Theme = "default" | "playful" | "classic";

type ThemeContextValue = {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  toggleDark: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "lv-theme";
const DARK_STORAGE_KEY = "lv-dark";

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("default");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "playful" || savedTheme === "classic" || savedTheme === "default") {
      setTheme(savedTheme);
    }

    const savedDark = localStorage.getItem(DARK_STORAGE_KEY);
    if (savedDark !== null) {
      setIsDark(savedDark === "true");
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const themeKey = `${theme}${isDark ? "-dark" : ""}`;
    document.documentElement.setAttribute("data-theme", themeKey);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(DARK_STORAGE_KEY, String(isDark));
  }, [theme, isDark]);

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
    [theme, toggleDark, isDark]
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
