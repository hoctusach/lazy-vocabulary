
import { useEffect } from 'react';
import { VocabularyWord, EditableWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';

// Define a more specific type for adding new words where category is required
export type CustomWord = EditableWord;

// This hook is now mainly for backward compatibility
// The main functionality has been moved to VocabularyAppContainer
export const useCustomWords = () => {
  // Initial setup - make sure any existing custom words are integrated into the main vocabulary
  useEffect(() => {
    const storedWords = localStorage.getItem('customWords');
    if (storedWords) {
      try {
        // For backward compatibility, process any existing custom words
        const parsedWords = JSON.parse(storedWords);
        
        // Move custom words to main vocabulary arrays
        parsedWords.forEach((word: CustomWord) => {
          const vocabularyWord: VocabularyWord = {
            word: word.word,
            meaning: word.meaning,
            example: word.example,
            count: word.count ?? 0,
            category: word.category
          };
          
          // Add to All words
          addToCategory('All words', vocabularyWord);
          
          // Add to specific category
          addToCategory(word.category, vocabularyWord);
        });
        
        // Clear the old custom words storage after migration
        localStorage.removeItem('customWords');
      } catch (error) {
        console.error('Error processing custom words:', error);
      }
    }
  }, []);
  
  // Helper function to add a word to a category in localStorage
  const addToCategory = (category: string, word: VocabularyWord) => {
    try {
      // Get current words in category
      let words = [];
      const storedWords = localStorage.getItem(category);
      if (storedWords) {
        words = JSON.parse(storedWords);
      }
      
      // Check if word already exists
      const exists = words.some((w: VocabularyWord) => 
        w.word.toLowerCase() === word.word.toLowerCase());
      
      if (!exists) {
        // Add word and save
        words.push(word);
        localStorage.setItem(category, JSON.stringify(words));
      }
    } catch (error) {
      console.error(`Error adding word to ${category}:`, error);
    }
  };
  
  // These functions are now stubs that simply add words to main vocabulary
  const addCustomWord = (newWord: CustomWord) => {
    const vocabularyWord: VocabularyWord = {
      word: newWord.word,
      meaning: newWord.meaning,
      example: newWord.example,
      count: newWord.count ?? 0,
      category: newWord.category
    };
    
    // Add to All words
    addToCategory('All words', vocabularyWord);
    
    // Add to specific category
    addToCategory(newWord.category, vocabularyWord);
    
    // Refresh the service if needed
    vocabularyService.loadDefaultVocabulary();
  };
  
  const updateWord = (updatedWord: CustomWord) => {
    const vocabularyWord: VocabularyWord = {
      word: updatedWord.word,
      meaning: updatedWord.meaning,
      example: updatedWord.example,
      count: updatedWord.count ?? 0,
      category: updatedWord.category
    };
    
    // Update in All words and specific category
    updateInCategory('All words', vocabularyWord);
    updateInCategory(updatedWord.category, vocabularyWord);
    
    // Refresh the service if needed
    vocabularyService.loadDefaultVocabulary();
    
    return true;
  };
  
  // Helper to update a word in a category
  const updateInCategory = (category: string, word: VocabularyWord) => {
    try {
      // Get current words
      let words = [];
      const storedWords = localStorage.getItem(category);
      if (storedWords) {
        words = JSON.parse(storedWords);
      }
      
      // Find and update the word
      const index = words.findIndex((w: VocabularyWord) => 
        w.word.toLowerCase() === word.word.toLowerCase());
      
      if (index >= 0) {
        words[index] = word;
      } else {
        words.push(word);
      }
      
      // Save back
      localStorage.setItem(category, JSON.stringify(words));
    } catch (error) {
      console.error(`Error updating word in ${category}:`, error);
    }
  };

  return {
    customWords: [],  // Empty array since we don't use this anymore
    addCustomWord,    // Stub function for backward compatibility
    updateWord,       // Stub function for backward compatibility
  };
};
