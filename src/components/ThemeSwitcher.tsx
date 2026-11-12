import { useEffect, useMemo, useState } from "react";
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

const ThemeSwitcher: React.FC = () => {
  const { toggleDark, isDark } = useTheme();
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

  const handleQuickThemeChange = (name: ThemeOption["name"]) => {
    applyTheme(name);
    setActiveQuickTheme(name);
  };

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
            className={`h-11 w-11 min-h-11 min-w-11 rounded-full border theme-border bg-[var(--lv-card-bg)] shadow-md flex items-center justify-center text-lg transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lv-accent)] ${
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
    <div className="theme-switcher flex flex-wrap gap-2 items-center justify-center w-full text-sm">
      {quickThemeButtons}
      <button
        type="button"
        onClick={toggleDark}
        className="w-11 h-11 rounded-full border theme-border bg-[var(--lv-card-bg)] shadow-md flex items-center justify-center text-2xl transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lv-accent)]"
        title="Toggle dark mode"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={isDark}
      >
        {isDark ? "🌙" : "☀️"}
      </button>
    </div>
  );
};

export default ThemeSwitcher;
