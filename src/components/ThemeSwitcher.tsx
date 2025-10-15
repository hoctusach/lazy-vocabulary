import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";
import { applyTheme, getActiveTheme, userThemes } from "@/lib/themeManager";

type ThemeOption = {
  name: (typeof userThemes)[number];
  emoji: string;
  label: string;
};

const themeOptions: ThemeOption[] = [
  { name: "mint", emoji: "🌿", label: "Mint Breeze" },
  { name: "morning", emoji: "☀️", label: "Morning Glow" },
  { name: "ocean", emoji: "🌊", label: "Ocean Depth" },
  { name: "sakura", emoji: "🌸", label: "Sakura Dream" },
  { name: "cyber", emoji: "🔮", label: "Cyber Night" }
];

type BaseThemeName = "default" | "playful" | "classic";

type BaseThemeOption = {
  name: BaseThemeName;
  emoji: string;
  label: string;
};

const baseThemeOptions: BaseThemeOption[] = [
  { name: "default", emoji: "🎨", label: "Default" },
  { name: "playful", emoji: "🎉", label: "Playful" },
  { name: "classic", emoji: "📜", label: "Classic" }
];

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, toggleDark, isDark } = useTheme();
  const [activeQuickTheme, setActiveQuickTheme] = useState(() => getActiveTheme());

  useEffect(() => {
    setActiveQuickTheme(getActiveTheme());

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "user-theme") {
        setActiveQuickTheme(getActiveTheme());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleValueChange = (value: string) => {
    if (value === "default" || value === "playful" || value === "classic") {
      setTheme(value);
    }
  };

  const handleQuickThemeChange = (name: ThemeOption["name"]) => {
    applyTheme(name);
    setActiveQuickTheme(name);
  };

  const baseThemeButtons = useMemo(
    () =>
      baseThemeOptions.map((option) => {
        const isActive = theme === option.name;
        return (
          <button
            key={option.name}
            type="button"
            data-theme={option.name}
            onClick={() => setTheme(option.name)}
            className={`w-9 h-9 rounded-full border theme-border bg-[var(--lv-card-bg)] shadow-md flex items-center justify-center text-lg transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lv-accent)] ${
              isActive ? "ring-2 ring-[var(--lv-accent)] scale-110" : ""
            }`}
            title={option.label}
            aria-label={option.label}
            aria-pressed={isActive}
          >
            {option.emoji}
          </button>
        );
      }),
    [setTheme, theme]
  );

  const quickThemeButtons = useMemo(
    () =>
      themeOptions.map((option) => {
        const isActive = activeQuickTheme === option.name;
        return (
          <button
            key={option.name}
            type="button"
            data-theme={option.name}
            onClick={() => handleQuickThemeChange(option.name)}
            className={`w-9 h-9 rounded-full border theme-border bg-[var(--lv-card-bg)] shadow-md flex items-center justify-center text-lg transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lv-accent)] ${
              isActive ? "ring-2 ring-[var(--lv-accent)] scale-110" : ""
            }`}
            title={option.label}
            aria-label={option.label}
            aria-pressed={isActive}
          >
            {option.emoji}
          </button>
        );
      }),
    [activeQuickTheme]
  );

  return (
    <div className="flex flex-col items-center sm:items-end gap-3 text-sm w-full">
      <div className="flex items-center gap-3">
        <Select value={theme} onValueChange={handleValueChange}>
          <SelectTrigger className="w-40 border theme-border bg-[var(--lv-card-bg)] text-[var(--lv-text-primary)] shadow-sm transition-all duration-300 hover:shadow-md">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--lv-card-bg)] text-[var(--lv-text-primary)] border theme-border shadow-lg">
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="playful">Playful 🌈</SelectItem>
            <SelectItem value="classic">Classic 🪶</SelectItem>
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={toggleDark}
          className="rounded-full border theme-border bg-[var(--lv-card-bg)] p-2 text-lg transition-transform duration-300 hover:scale-110"
          title="Toggle dark mode"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "🌙" : "☀️"}
        </button>
      </div>

      <div className="theme-switcher flex flex-wrap gap-2 items-center justify-center w-full">
        {baseThemeButtons}
        {quickThemeButtons}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
