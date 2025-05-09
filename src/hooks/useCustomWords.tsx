import { useState, useEffect } from 'react';
import { VocabularyWord, SheetData, EditableWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';

// Define a more specific type for adding new words where category is required
export type CustomWord = EditableWord;

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
      const existingWord = updatedWords[wordIndex];
      
      // Keep track of old category for potential category change
      const oldCategory = existingWord.category;
      const newCategory = updatedWord.category;
      
      // Preserve the count
      const count = existingWord.count ?? 0;
      updatedWords[wordIndex] = { ...updatedWord, count };
      
      // Update state
      setCustomWords(updatedWords);
      
      // Save to localStorage
      localStorage.setItem('customWords', JSON.stringify(updatedWords));
      
      // Update in vocabulary service
      // If the category changed, handle moving the word between categories
      if (oldCategory !== newCategory) {
        updateWordWithCategoryChange(updatedWord, oldCategory, newCategory);
      } else {
        updateInVocabularyService(updatedWord);
      }
      
      return true;
    } else {
      // Word doesn't exist in custom words
      // Try to update in vocabulary service (might be a built-in word)
      return updateInVocabularyService(updatedWord);
    }
  };

  // Function to handle updating a word when its category changes
  const updateWordWithCategoryChange = (updatedWord: CustomWord, oldCategory: string, newCategory: string) => {
    // Get all existing vocabulary data
    const allData = vocabularyService.getAllVocabularyData();
    
    // Remove the word from its old category array
    if (allData[oldCategory]) {
      allData[oldCategory] = allData[oldCategory].filter(word => 
        word.word.toLowerCase() !== updatedWord.word.toLowerCase());
    }
    
    // Create or update the new category array
    if (!allData[newCategory]) {
      allData[newCategory] = [];
    }
    
    // Convert CustomWord to VocabularyWord
    const vocabularyWord: VocabularyWord = {
      word: updatedWord.word,
      meaning: updatedWord.meaning,
      example: updatedWord.example,
      count: updatedWord.count !== undefined ? updatedWord.count : 0,
      category: newCategory
    };
    
    // Add to new category
    allData[newCategory].push(vocabularyWord);
    
    // Update the vocabulary service with the modified data
    vocabularyService.mergeCustomWords(allData);
    
    return true;
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
