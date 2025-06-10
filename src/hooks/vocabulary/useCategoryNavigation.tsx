
import { vocabularyService } from "@/services/vocabularyService";

export const useCategoryNavigation = () => {
  // Current and next category information (excluding "All words")
  const currentCategory = vocabularyService.getCurrentSheetName();
  const sheetOptions = vocabularyService.sheetOptions; // This no longer includes "All words"
  const nextIndex = (sheetOptions.indexOf(currentCategory) + 1) % sheetOptions.length;
  const nextCategory = sheetOptions[nextIndex];

  return {
    currentCategory,
    nextCategory,
    sheetOptions
  };
};
