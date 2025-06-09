
import { VocabularyWord } from "@/types/vocabulary";

export class RandomWordSelector {
  private viewedWordsKey = 'viewedWords';
  private shuffledIndicesKey = 'shuffledIndices';
  private currentIndexKey = 'currentIndex';
  private currentCategoryKey = 'currentCategory';

  /**
   * Get viewed words for a category from localStorage
   */
  private getViewedWords(category: string): Set<string> {
    try {
      const stored = localStorage.getItem(`${this.viewedWordsKey}_${category}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error('Error loading viewed words:', error);
      return new Set();
    }
  }

  /**
   * Save viewed words for a category to localStorage
   */
  private saveViewedWords(category: string, viewedWords: Set<string>): void {
    try {
      localStorage.setItem(`${this.viewedWordsKey}_${category}`, JSON.stringify([...viewedWords]));
    } catch (error) {
      console.error('Error saving viewed words:', error);
    }
  }

  /**
   * Get shuffled indices for a category from localStorage
   */
  private getShuffledIndices(category: string): number[] {
    try {
      const stored = localStorage.getItem(`${this.shuffledIndicesKey}_${category}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading shuffled indices:', error);
      return [];
    }
  }

  /**
   * Save shuffled indices for a category to localStorage
   */
  private saveShuffledIndices(category: string, indices: number[]): void {
    try {
      localStorage.setItem(`${this.shuffledIndicesKey}_${category}`, JSON.stringify(indices));
    } catch (error) {
      console.error('Error saving shuffled indices:', error);
    }
  }

  /**
   * Get current index for a category from localStorage
   */
  private getCurrentIndex(category: string): number {
    try {
      const stored = localStorage.getItem(`${this.currentIndexKey}_${category}`);
      return stored ? parseInt(stored, 10) : -1;
    } catch (error) {
      console.error('Error loading current index:', error);
      return -1;
    }
  }

  /**
   * Save current index for a category to localStorage
   */
  private saveCurrentIndex(category: string, index: number): void {
    try {
      localStorage.setItem(`${this.currentIndexKey}_${category}`, index.toString());
    } catch (error) {
      console.error('Error saving current index:', error);
    }
  }

  /**
   * Create a new random shuffle for the given word list
   */
  private createRandomShuffle(wordList: VocabularyWord[]): number[] {
    const indices = Array.from({ length: wordList.length }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    return indices;
  }

  /**
   * Initialize or get shuffled order for a category
   */
  initializeCategory(category: string, wordList: VocabularyWord[]): void {
    console.log(`[RANDOM-SELECTOR] Initializing category: ${category} with ${wordList.length} words`);
    
    let shuffledIndices = this.getShuffledIndices(category);
    
    // If no shuffled indices exist or they don't match the word list length, create new ones
    if (shuffledIndices.length !== wordList.length) {
      console.log(`[RANDOM-SELECTOR] Creating new shuffle for ${category}`);
      shuffledIndices = this.createRandomShuffle(wordList);
      this.saveShuffledIndices(category, shuffledIndices);
      this.saveCurrentIndex(category, 0); // Reset to start
    }
  }

  /**
   * Get the current word for a category
   */
  getCurrentWord(category: string, wordList: VocabularyWord[]): VocabularyWord | null {
    if (wordList.length === 0) {
      console.log(`[RANDOM-SELECTOR] No words available for category: ${category}`);
      return null;
    }

    const shuffledIndices = this.getShuffledIndices(category);
    const currentIndex = this.getCurrentIndex(category);

    if (shuffledIndices.length === 0 || currentIndex === -1) {
      console.log(`[RANDOM-SELECTOR] No shuffle data for ${category}, initializing`);
      this.initializeCategory(category, wordList);
      return this.getCurrentWord(category, wordList);
    }

    if (currentIndex >= 0 && currentIndex < shuffledIndices.length) {
      const wordIndex = shuffledIndices[currentIndex];
      if (wordIndex >= 0 && wordIndex < wordList.length) {
        const word = wordList[wordIndex];
        console.log(`[RANDOM-SELECTOR] Current word for ${category}: ${word.word} (index ${currentIndex}/${shuffledIndices.length-1})`);
        return { ...word }; // Return a copy
      }
    }

    console.log(`[RANDOM-SELECTOR] Invalid indices for ${category}, reinitializing`);
    this.initializeCategory(category, wordList);
    return this.getCurrentWord(category, wordList);
  }

  /**
   * Advance to the next word in the random sequence
   */
  getNextWord(category: string, wordList: VocabularyWord[]): VocabularyWord | null {
    if (wordList.length === 0) {
      console.log(`[RANDOM-SELECTOR] No words available for category: ${category}`);
      return null;
    }

    let shuffledIndices = this.getShuffledIndices(category);
    let currentIndex = this.getCurrentIndex(category);

    // Initialize if needed
    if (shuffledIndices.length === 0 || currentIndex === -1) {
      this.initializeCategory(category, wordList);
      shuffledIndices = this.getShuffledIndices(category);
      currentIndex = 0;
    }

    // Move to next word
    const nextIndex = (currentIndex + 1) % shuffledIndices.length;
    
    // If we've completed a full cycle, create a new shuffle to avoid repetition
    if (nextIndex === 0 && currentIndex !== -1) {
      console.log(`[RANDOM-SELECTOR] Completed cycle for ${category}, creating new shuffle`);
      shuffledIndices = this.createRandomShuffle(wordList);
      this.saveShuffledIndices(category, shuffledIndices);
    }

    this.saveCurrentIndex(category, nextIndex);

    const wordIndex = shuffledIndices[nextIndex];
    if (wordIndex >= 0 && wordIndex < wordList.length) {
      const word = wordList[wordIndex];
      
      // Track viewed word
      const viewedWords = this.getViewedWords(category);
      viewedWords.add(word.word);
      this.saveViewedWords(category, viewedWords);

      // Increment count and save
      const currentValue = word.count;
      let newValue: string | number;
      
      if (typeof currentValue === 'string') {
        newValue = String(parseInt(currentValue || '0', 10) + 1);
      } else {
        newValue = (currentValue || 0) + 1;
      }
      
      word.count = newValue;

      console.log(`[RANDOM-SELECTOR] Next word for ${category}: ${word.word} (index ${nextIndex}/${shuffledIndices.length-1})`);
      return { ...word }; // Return a copy
    }

    console.error(`[RANDOM-SELECTOR] Invalid word index ${wordIndex} for category ${category}`);
    return null;
  }

  /**
   * Switch to a new category and get the first word
   */
  switchCategory(newCategory: string, wordList: VocabularyWord[]): VocabularyWord | null {
    console.log(`[RANDOM-SELECTOR] Switching to category: ${newCategory}`);
    
    // Initialize the new category
    this.initializeCategory(newCategory, wordList);
    
    // Get the current word for the new category
    return this.getCurrentWord(newCategory, wordList);
  }

  /**
   * Reset viewed words for a category (useful for testing or manual reset)
   */
  resetViewedWords(category: string): void {
    localStorage.removeItem(`${this.viewedWordsKey}_${category}`);
    console.log(`[RANDOM-SELECTOR] Reset viewed words for category: ${category}`);
  }

  /**
   * Get statistics for a category
   */
  getCategoryStats(category: string, wordList: VocabularyWord[]): {
    totalWords: number;
    viewedWords: number;
    currentPosition: number;
    totalPositions: number;
  } {
    const viewedWords = this.getViewedWords(category);
    const currentIndex = this.getCurrentIndex(category);
    const shuffledIndices = this.getShuffledIndices(category);
    
    return {
      totalWords: wordList.length,
      viewedWords: viewedWords.size,
      currentPosition: currentIndex + 1,
      totalPositions: shuffledIndices.length
    };
  }
}
