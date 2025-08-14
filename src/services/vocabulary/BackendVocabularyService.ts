import { VocabularyWord, SheetData } from "@/types/vocabulary";
import { backendClient, Category } from "@/services/api/backendClient";

type VocabularyChangeListener = () => void;

export class BackendVocabularyService {
  private listeners: VocabularyChangeListener[] = [];
  private categories: Category[] = [];
  private currentCategory: Category | null = null;
  private words: VocabularyWord[] = [];
  private currentWordIndex = 0;

  readonly sheetOptions: string[] = [
    "phrasal verbs",
    "idioms", 
    "topic vocab",
    "grammar",
    "phrases, collocations",
    "word formation"
  ];

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      this.categories = await backendClient.getCategories();
      if (this.categories.length > 0) {
        this.currentCategory = this.categories[0];
        await this.loadWordsForCurrentCategory();
      }
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load data from backend:', error);
    }
  }

  private async loadWordsForCurrentCategory() {
    if (!this.currentCategory) return;
    
    try {
      const backendWords = await backendClient.getWordsByCategory(this.currentCategory.category_id);
      this.words = backendWords.map(word => ({
        id: word.word_id,
        word: word.word_text,
        meaning: word.meaning,
        example: word.example || "",
        translation: word.translation || "",
        count: 1
      }));
    } catch (error) {
      console.error('Failed to load words:', error);
      this.words = [];
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  getWordList(): VocabularyWord[] {
    return this.words;
  }

  addVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.listeners.push(listener);
  }

  removeVocabularyChangeListener(listener: VocabularyChangeListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  getAllSheetNames(): string[] {
    return this.categories.map(cat => cat.name);
  }

  async processExcelFile(file: File): Promise<boolean> {
    // Keep existing file processing logic for now
    return false;
  }

  loadDefaultVocabulary(data?: SheetData): boolean {
    // Data is loaded from backend in constructor
    return true;
  }

  getCurrentSheetName(): string {
    return this.currentCategory?.name || this.sheetOptions[0];
  }

  async switchSheet(sheetName: string): Promise<boolean> {
    const category = this.categories.find(cat => cat.name === sheetName);
    if (category) {
      this.currentCategory = category;
      await this.loadWordsForCurrentCategory();
      this.currentWordIndex = 0;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  nextSheet(): string {
    const currentIndex = this.categories.findIndex(cat => cat.category_id === this.currentCategory?.category_id);
    const nextIndex = (currentIndex + 1) % this.categories.length;
    const nextCategory = this.categories[nextIndex];
    this.switchSheet(nextCategory.name);
    return nextCategory.name;
  }

  getCurrentWord(): VocabularyWord | null {
    return this.words[this.currentWordIndex] || null;
  }

  getNextWord(): VocabularyWord | null {
    this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
    return this.getCurrentWord();
  }

  hasData(): boolean {
    return this.words.length > 0;
  }

  getLastWordChangeTime(): number {
    return Date.now();
  }

  mergeCustomWords(customData: SheetData): void {
    // Handle custom words if needed
  }
}