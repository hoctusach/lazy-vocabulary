
export class SheetNormalizer {
  private sheetOptions: string[];
  
  constructor(sheetOptions: string[]) {
    this.sheetOptions = sheetOptions;
  }
  
  // Normalize sheet names to match our expected format (excluding "All words")
  normalizeSheetName(name: string): string {
    const normalized = name.toLowerCase().trim();
    
    if (normalized.includes("phrasal") || normalized.includes("verb")) return "phrasal verbs";
    if (normalized.includes("idiom")) return "idioms";
    if (normalized.includes("advanced")) return "advanced words";
    
    // Default to "phrasal verbs" if no match (instead of original name)
    return "phrasal verbs";
  }
}
