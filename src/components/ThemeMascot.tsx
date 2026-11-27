import { useThemeOptional } from "@/contexts/ThemeContext";
import slothDefault from "@/assets/sloth-mascot.webp";
import slothPixel from "@/assets/sloth-pixel.webp";
import slothRiso from "@/assets/sloth-riso.webp";
import slothRisoDark from "@/assets/sloth-riso-dark.webp";

/** Decorative sloth, one variant per theme (pixel sloth for Pixel Quest, riso sloth for Riso Zine). */
const ThemeMascot: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, isDark } = useThemeOptional();
  const src =
    theme === "pixel" ? slothPixel : theme === "riso" ? (isDark ? slothRisoDark : slothRiso) : slothDefault;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={className}
      data-mascot={theme}
    />
  );
};

export default ThemeMascot;
