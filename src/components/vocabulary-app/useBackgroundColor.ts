
import { useState, useCallback } from "react";

const backgroundColors = [
  "#f2f2f2", "#e6f7ff", "#fff3e6", "#f9e6f6", "#f0f8ff",
  "#faebd7", "#ffefd5", "#e6e6fa", "#dcdcdc", "#fdf5e6",
  "#ffe4e1", "#fff0f5", "#f5fffa", "#f0fff0", "#f5f5dc",
  "#faf0e6", "#fffacd", "#e0ffff", "#e0f7fa", "#fce4ec"
];

export function useBackgroundColor() {
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
  const color = backgroundColors[backgroundColorIndex % backgroundColors.length];

  const advanceColor = useCallback(() => {
    setBackgroundColorIndex(idx => (idx + 1) % backgroundColors.length);
  }, []);

  return { backgroundColor: color, advanceColor, backgroundColorIndex, setBackgroundColorIndex, backgroundColors };
}
