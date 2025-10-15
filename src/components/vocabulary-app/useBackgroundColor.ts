
import { useState, useCallback } from "react";

const backgroundColors = [
  "var(--lv-card-tone-1)",
  "var(--lv-card-tone-2)",
  "var(--lv-card-tone-3)",
  "var(--lv-card-tone-4)",
  "var(--lv-card-tone-5)"
];

export function useBackgroundColor() {
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
  const color = backgroundColors[backgroundColorIndex % backgroundColors.length];

  const advanceColor = useCallback(() => {
    setBackgroundColorIndex(idx => (idx + 1) % backgroundColors.length);
  }, []);

  return { backgroundColor: color, advanceColor, backgroundColorIndex, setBackgroundColorIndex, backgroundColors };
}
