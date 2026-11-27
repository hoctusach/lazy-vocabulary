import { useMemo } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { FREE_THEME, type ThemeName } from "@/lib/themeManager";
import { useProFeature } from "@/services/billing/proFeatures";
import { openProUpgrade } from "@/services/billing/proUpgradeStore";
import ProBadge from "@/components/pro/ProBadge";

type ThemeOption = {
  name: ThemeName;
  label: string;
  description: string;
};

export const themeOptions: ThemeOption[] = [
  { name: "notes", label: "Margin Notes", description: "Lined paper, highlighter" },
  { name: "sloth", label: "Cozy Sloth", description: "Warm, soft, rounded" },
  { name: "blocks", label: "Bold Blocks", description: "Thick lines, flat colour" },
  { name: "pixel", label: "Pixel Quest", description: "Retro game, XP & combos" },
  { name: "riso", label: "Riso Zine", description: "Two-ink print, grain" }
];

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, toggleDark, isDark } = useTheme();
  const allThemes = useProFeature("allThemes");

  const buttons = useMemo(
    () =>
      themeOptions.map((option) => {
        const isActive = theme === option.name;
        const locked = !allThemes && option.name !== FREE_THEME;
        return (
          <button
            key={option.name}
            type="button"
            data-theme-option={option.name}
            data-active={isActive ? "true" : "false"}
            data-locked={locked ? "true" : "false"}
            onClick={() => (locked ? openProUpgrade("allThemes") : setTheme(option.name))}
            className="lv-theme-card flex min-h-11 w-full items-center gap-3 rounded-xl border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lv-accent)]"
            title={option.label}
            aria-label={locked ? `${option.label} (Pro feature)` : option.label}
            aria-pressed={isActive}
          >
            <span className="lv-swatch" data-swatch={option.name} aria-hidden="true">
              <span className="lv-swatch-word">Aa</span>
              <span className="lv-swatch-bar" />
              <span className="lv-swatch-bar lv-swatch-bar-short" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="lv-theme-name block text-sm font-bold leading-tight">{option.label}</span>
              <span className="theme-muted-text block text-xs leading-snug">{option.description}</span>
            </span>
            <span className="lv-theme-check shrink-0 text-xs font-bold" aria-hidden="true">
              {isActive ? "✓" : ""}
            </span>
            {locked && <ProBadge />}
          </button>
        );
      }),
    [theme, setTheme, allThemes]
  );

  return (
    <div className="theme-switcher w-full space-y-3 text-sm">
      <h3 className="lv-section-title">Appearance</h3>
      <div className="grid grid-cols-1 gap-2" role="group" aria-label="Choose a theme">
        {buttons}
      </div>
      <button
        type="button"
        onClick={toggleDark}
        className="lv-dark-toggle flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lv-accent)]"
        title="Toggle dark mode"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={isDark}
      >
        {isDark ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
        <span>{isDark ? "Dark mode" : "Light mode"}</span>
      </button>
    </div>
  );
};

export default ThemeSwitcher;
