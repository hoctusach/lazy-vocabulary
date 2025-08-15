
import { VocabularyWord } from '@/types/vocabulary';
import { wordCountManager } from '../WordCountManager';

export class WordSelectionService {
  private static instance: WordSelectionService;

  private constructor() {}

  static getInstance(): WordSelectionService {
    if (!WordSelectionService.instance) {
      WordSelectionService.instance = new WordSelectionService();
    }
    return WordSelectionService.instance;
  }

  // Select next word based on frequency tracking
  selectNextWord(
    words: VocabularyWord[], 
    currentIndex: number, 
    fromUser: boolean = false
  ): { word: VocabularyWord; index: number } {
    if (words.length === 0) {
      throw new Error('No words available');
    }

    // If manually triggered by user, just go to next in sequence
    if (fromUser) {
      const nextIndex = (currentIndex + 1) % words.length;
      return { word: words[nextIndex], index: nextIndex };
    }

    // For automatic progression, use frequency-based selection
    const sortedWords = wordCountManager.sortWordsByPriority(words);
    
    // Get the least shown words (bottom 30% or at least 5 words)
    const priorityPoolSize = Math.max(5, Math.floor(words.length * 0.3));
    const priorityWords = sortedWords.slice(0, priorityPoolSize);
    
    // Randomly select from the priority pool to add some variety
    const selectedWord = priorityWords[Math.floor(Math.random() * priorityWords.length)];
    const selectedIndex = words.findIndex(w => 
      w.word === selectedWord.word && w.category === selectedWord.category
    );

    return { 
      word: selectedWord, 
      index: selectedIndex >= 0 ? selectedIndex : 0 
    };
  }

  // Mark a word as shown (increment its count)
  markWordAsShown(word: VocabularyWord): void {
    wordCountManager.incrementCount(word);
  }

  // Get display count for a word
  getWordCount(word: VocabularyWord): number {
    return wordCountManager.getCount(word);
  }

  // Cleanup old word entries
  syncWithWordList(words: VocabularyWord[]): void {
    wordCountManager.cleanupOldEntries(words);
  }
}

export const wordSelectionService = WordSelectionService.getInstance();
