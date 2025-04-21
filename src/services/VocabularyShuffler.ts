
import { SheetData, VocabularyWord } from '@/types/vocabulary';

export class VocabularyShuffler {
  shuffledIndices: number[] = [];
  currentIndex: number = -1;

  shuffle(sheet: VocabularyWord[]): void {
    if (!sheet || sheet.length === 0) {
      this.shuffledIndices = [];
      return;
    }
    this.shuffledIndices = Array.from({ length: sheet.length }, (_, i) => i);
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
    this.currentIndex = -1;
  }

  getNextWord(sheet: VocabularyWord[], incrementCount: boolean = true): VocabularyWord | null {
    if (sheet.length === 0 || this.shuffledIndices.length === 0) {
      return null;
    }
    this.currentIndex = (this.currentIndex + 1) % this.shuffledIndices.length;
    const idx = this.shuffledIndices[this.currentIndex];
    if (sheet[idx]) {
      if (incrementCount) sheet[idx].count = (sheet[idx].count || 0) + 1;
      return { ...sheet[idx] };
    }
    return null;
  }

  getCurrentWord(sheet: VocabularyWord[]): VocabularyWord | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.shuffledIndices.length) {
      const idx = this.shuffledIndices[this.currentIndex];
      return sheet[idx] ? { ...sheet[idx] } : null;
    }
    return null;
  }
}
