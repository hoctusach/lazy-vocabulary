
import { useState, useEffect } from 'react';
import { VocabularyWord, SheetData } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';

// Define a more specific type for adding new words where category is required
export interface CustomWord {
  word: string;
  meaning: string;
  example: string;
  category: string; // Required for new custom words
  count?: number | string;
}

export const useCustomWords = () => {
  const [customWords, setCustomWords] = useState<CustomWord[]>([]);

  // Load custom words from localStorage on mount
  useEffect(() => {
    const storedWords = localStorage.getItem('customWords');
    if (storedWords) {
      try {
        const parsedWords = JSON.parse(storedWords);
        setCustomWords(parsedWords);

        // Add custom words to vocabulary service
        mergeCustomWords(parsedWords);
      } catch (error) {
        console.error('Error loading custom words from localStorage:', error);
      }
    }
  }, []);

  // Function to add a new custom word
  const addCustomWord = (newWord: CustomWord) => {
    // Add count property with initial value 0
    const wordWithCount = { ...newWord, count: newWord.count ?? 0 };
    
    // Update state with new word
    const updatedWords = [...customWords, wordWithCount];
    setCustomWords(updatedWords);
    
    // Save to localStorage
    localStorage.setItem('customWords', JSON.stringify(updatedWords));
    
    // Merge the new word into the vocabulary service
    mergeCustomWords([wordWithCount]);
  };
  
  // Function to update an existing word
  const updateWord = (updatedWord: CustomWord) => {
    // Find if the word already exists in custom words
    const wordIndex = customWords.findIndex(word => 
      word.word.toLowerCase() === updatedWord.word.toLowerCase());
    
    if (wordIndex >= 0) {
      // Word exists in custom words, update it
      const updatedWords = [...customWords];
      // Preserve the count
      const count = updatedWords[wordIndex].count ?? 0;
      updatedWords[wordIndex] = { ...updatedWord, count };
      
      // Update state
      setCustomWords(updatedWords);
      
      // Save to localStorage
      localStorage.setItem('customWords', JSON.stringify(updatedWords));
      
      // Update in vocabulary service
      updateInVocabularyService(updatedWord);
      
      return true;
    } else {
      // Word doesn't exist in custom words
      // Try to update in vocabulary service (might be a built-in word)
      return updateInVocabularyService(updatedWord);
    }
  };

  // Function to update a word in the vocabulary service
  const updateInVocabularyService = (updatedWord: CustomWord) => {
    // Since vocabularyService doesn't expose a direct update method,
    // we'll merge the updated word which should overwrite the existing one
    const dataToMerge: SheetData = {
      [updatedWord.category]: [{ 
        word: updatedWord.word,
        meaning: updatedWord.meaning,
        example: updatedWord.example,
        count: updatedWord.count !== undefined ? updatedWord.count : 0,
        category: updatedWord.category 
      }]
    };
    
    vocabularyService.mergeCustomWords(dataToMerge);
    return true;
  };

  // Function to merge custom words with the vocabulary service
  const mergeCustomWords = (words: CustomWord[]) => {
    if (!words.length) return;

    // Create a temporary data structure to merge
    const dataToMerge: SheetData = {};
    
    words.forEach(word => {
      // Add to specific category
      if (!dataToMerge[word.category]) {
        dataToMerge[word.category] = [];
      }
      
      // Map the CustomWord to VocabularyWord
      const vocabularyWord: VocabularyWord = {
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        count: word.count !== undefined ? word.count : 0,
        category: word.category // Category is always required for custom words
      };
      
      dataToMerge[word.category].push(vocabularyWord);
    });

    // Use the vocabulary service to merge the data
    vocabularyService.mergeCustomWords(dataToMerge);
  };

  return {
    customWords,
    addCustomWord,
    updateWord
  };
};
