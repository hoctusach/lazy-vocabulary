
import { VocabularyWord } from '@/types/vocabulary';

interface WordCount {
  word: string;
  count: number;
  lastShown: Date;
}

interface WordCountData {
  [wordKey: string]: WordCount;
}

class WordCountManager {
  private static instance: WordCountManager;
  private storageKey = 'vocabulary-word-counts';
  private wordCounts: WordCountData = {};

  private constructor() {
    this.loadCounts();
  }

  static getInstance(): WordCountManager {
    if (!WordCountManager.instance) {
      WordCountManager.instance = new WordCountManager();
    }
    return WordCountManager.instance;
  }

  private loadCounts(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Convert date strings back to Date objects
        this.wordCounts = Object.keys(data).reduce((acc, key) => {
          acc[key] = {
            ...data[key],
            lastShown: new Date(data[key].lastShown)
          };
          return acc;
        }, {} as WordCountData);
      }
    } catch (error) {
      console.error('Failed to load word counts:', error);
      this.wordCounts = {};
    }
  }

  private saveCounts(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.wordCounts));
    } catch (error) {
      console.error('Failed to save word counts:', error);
    }
  }

  private getWordKey(word: VocabularyWord): string {
    return `${word.word.toLowerCase()}_${word.category || 'default'}`;
  }

  incrementCount(word: VocabularyWord): void {
    const key = this.getWordKey(word);
    
    if (!this.wordCounts[key]) {
      this.wordCounts[key] = {
        word: word.word,
        count: 0,
        lastShown: new Date()
      };
    }

    this.wordCounts[key].count += 1;
    this.wordCounts[key].lastShown = new Date();
    this.saveCounts();
  }

  getCount(word: VocabularyWord): number {
    const key = this.getWordKey(word);
    return this.wordCounts[key]?.count || 0;
  }

  getLastShown(word: VocabularyWord): Date | null {
    const key = this.getWordKey(word);
    return this.wordCounts[key]?.lastShown || null;
  }

  // Sort words by count (lowest first) and last shown date
  sortWordsByPriority(words: VocabularyWord[]): VocabularyWord[] {
    return [...words].sort((a, b) => {
      const countA = this.getCount(a);
      const countB = this.getCount(b);
      
      // If counts are different, prioritize lower count
      if (countA !== countB) {
        return countA - countB;
      }

      // If counts are the same, prioritize older last shown date
      const lastShownA = this.getLastShown(a);
      const lastShownB = this.getLastShown(b);
      
      if (!lastShownA && !lastShownB) return 0;
      if (!lastShownA) return -1; // Never shown words come first
      if (!lastShownB) return 1;
      
      return lastShownA.getTime() - lastShownB.getTime();
    });
  }

  // Get statistics for debugging/display
  getStatistics(): { totalWords: number; averageCount: number; mostShownWord: string | null } {
    const counts = Object.values(this.wordCounts);
    const totalWords = counts.length;
    
    if (totalWords === 0) {
      return { totalWords: 0, averageCount: 0, mostShownWord: null };
    }

    const totalCount = counts.reduce((sum, item) => sum + item.count, 0);
    const averageCount = totalCount / totalWords;
    
    const mostShown = counts.reduce((max, item) => 
      item.count > max.count ? item : max
    );

    return {
      totalWords,
      averageCount: Math.round(averageCount * 100) / 100,
      mostShownWord: mostShown.word
    };
  }

  // Reset all counts (for testing/admin purposes)
  resetAllCounts(): void {
    this.wordCounts = {};
    this.saveCounts();
  }

  // Clean up old entries that are no longer in the word list
  cleanupOldEntries(currentWords: VocabularyWord[]): void {
    const currentKeys = new Set(currentWords.map(word => this.getWordKey(word)));
    const storedKeys = Object.keys(this.wordCounts);
    
    let cleaned = false;
    storedKeys.forEach(key => {
      if (!currentKeys.has(key)) {
        delete this.wordCounts[key];
        cleaned = true;
      }
    });

    if (cleaned) {
      this.saveCounts();
    }
  }
}

export const wordCountManager = WordCountManager.getInstance();
