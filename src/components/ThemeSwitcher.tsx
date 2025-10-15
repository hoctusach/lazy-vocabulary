import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, toggleDark, isDark } = useTheme();

  const handleValueChange = (value: string) => {
    if (value === "default" || value === "playful" || value === "classic") {
      setTheme(value);
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm">
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
  );
};

export default ThemeSwitcher;
