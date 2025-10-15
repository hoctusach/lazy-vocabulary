import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleValueChange = (value: string) => {
    if (value === "default" || value === "playful" || value === "classic") {
      setTheme(value);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Select value={theme} onValueChange={handleValueChange}>
        <SelectTrigger className="w-36 border theme-border bg-[var(--lv-card-bg)] text-[var(--lv-text-primary)] transition-all duration-300">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--lv-card-bg)] text-[var(--lv-text-primary)] border theme-border">
          <SelectItem value="default">Default</SelectItem>
          <SelectItem value="playful">Playful 🌈</SelectItem>
          <SelectItem value="classic">Classic 🪶</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ThemeSwitcher;
