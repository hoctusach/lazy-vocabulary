
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
    
    // Also save directly to the main vocabulary arrays in localStorage
    saveWordToMainVocabulary(wordWithCount);
  };
  
  // Function to save a word directly to main vocabulary arrays in localStorage
  const saveWordToMainVocabulary = (word: CustomWord) => {
    // Save to All words array
    const allWordsKey = 'All words';
    let allWords = [];
    try {
      const storedAllWords = localStorage.getItem(allWordsKey);
      if (storedAllWords) {
        allWords = JSON.parse(storedAllWords);
      }
    } catch (error) {
      console.error('Error loading All words from localStorage:', error);
    }
    
    // Create a proper VocabularyWord
    const vocabularyWord: VocabularyWord = {
      word: word.word,
      meaning: word.meaning,
      example: word.example,
      count: word.count !== undefined ? word.count : 0,
      category: word.category
    };
    
    // Add to All words array
    allWords.push(vocabularyWord);
    localStorage.setItem(allWordsKey, JSON.stringify(allWords));
    
    // Save to category-specific array
    const categoryKey = word.category;
    let categoryWords = [];
    try {
      const storedCategoryWords = localStorage.getItem(categoryKey);
      if (storedCategoryWords) {
        categoryWords = JSON.parse(storedCategoryWords);
      }
    } catch (error) {
      console.error(`Error loading ${categoryKey} from localStorage:`, error);
    }
    
    // Add to category array
    categoryWords.push(vocabularyWord);
    localStorage.setItem(categoryKey, JSON.stringify(categoryWords));
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
      
      // Also update in main vocabulary arrays
      updateWordInMainVocabulary(updatedWord, oldCategory);
      
      return true;
    } else {
      // Word doesn't exist in custom words
      // Try to update in vocabulary service (might be a built-in word)
      const result = updateInVocabularyService(updatedWord);
      
      // Also try to update in main vocabulary arrays
      updateWordInMainVocabulary(updatedWord);
      
      return result;
    }
  };
  
  // Function to update a word in main vocabulary arrays
  const updateWordInMainVocabulary = (updatedWord: CustomWord, oldCategory?: string) => {
    // Update in All words array
    const allWordsKey = 'All words';
    let allWords = [];
    try {
      const storedAllWords = localStorage.getItem(allWordsKey);
      if (storedAllWords) {
        allWords = JSON.parse(storedAllWords);
      }
    } catch (error) {
      console.error('Error loading All words from localStorage:', error);
    }
    
    // Find and update the word in All words array
    const allWordsIndex = allWords.findIndex((word: VocabularyWord) => 
      word.word.toLowerCase() === updatedWord.word.toLowerCase());
    
    if (allWordsIndex >= 0) {
      // Word exists in All words, update it
      const vocabularyWord: VocabularyWord = {
        word: updatedWord.word,
        meaning: updatedWord.meaning,
        example: updatedWord.example,
        count: updatedWord.count !== undefined ? updatedWord.count : allWords[allWordsIndex].count,
        category: updatedWord.category
      };
      
      allWords[allWordsIndex] = vocabularyWord;
      localStorage.setItem(allWordsKey, JSON.stringify(allWords));
    }
    
    // Handle category-specific arrays
    if (oldCategory && oldCategory !== updatedWord.category) {
      // Category changed, remove from old category and add to new category
      
      // Remove from old category
      let oldCategoryWords = [];
      try {
        const storedOldCategoryWords = localStorage.getItem(oldCategory);
        if (storedOldCategoryWords) {
          oldCategoryWords = JSON.parse(storedOldCategoryWords);
        }
      } catch (error) {
        console.error(`Error loading ${oldCategory} from localStorage:`, error);
      }
      
      const filteredOldCategoryWords = oldCategoryWords.filter((word: VocabularyWord) => 
        word.word.toLowerCase() !== updatedWord.word.toLowerCase());
      
      localStorage.setItem(oldCategory, JSON.stringify(filteredOldCategoryWords));
    }
    
    // Add/update in new category
    const newCategoryKey = updatedWord.category;
    let newCategoryWords = [];
    try {
      const storedNewCategoryWords = localStorage.getItem(newCategoryKey);
      if (storedNewCategoryWords) {
        newCategoryWords = JSON.parse(storedNewCategoryWords);
      }
    } catch (error) {
      console.error(`Error loading ${newCategoryKey} from localStorage:`, error);
    }
    
    // Check if word already exists in this category
    const newCategoryIndex = newCategoryWords.findIndex((word: VocabularyWord) => 
      word.word.toLowerCase() === updatedWord.word.toLowerCase());
    
    const vocabularyWord: VocabularyWord = {
      word: updatedWord.word,
      meaning: updatedWord.meaning,
      example: updatedWord.example,
      count: updatedWord.count !== undefined ? updatedWord.count : 0,
      category: updatedWord.category
    };
    
    if (newCategoryIndex >= 0) {
      // Word already exists in new category, update it
      newCategoryWords[newCategoryIndex] = vocabularyWord;
    } else {
      // Word doesn't exist in new category, add it
      newCategoryWords.push(vocabularyWord);
    }
    
    localStorage.setItem(newCategoryKey, JSON.stringify(newCategoryWords));
  };

  // Function to handle updating a word when its category changes
  const updateWordWithCategoryChange = (updatedWord: CustomWord, oldCategory: string, newCategory: string) => {
    // Get all vocabulary data
    const allData = getAllVocabularyData();
    
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

  // Helper function to get all vocabulary data from the sheets
  const getAllVocabularyData = () => {
    // Create a temporary data structure to hold all sheet data
    const allData: SheetData = {};
    
    // Get all sheet names from the vocabulary service
    const sheetNames = vocabularyService.sheetOptions;
    
    // For each sheet, get all the words and add them to the data structure
    sheetNames.forEach(sheetName => {
      // Keep track of original sheet name to restore later
      const originalSheet = vocabularyService.getCurrentSheetName();
      
      // Switch to the sheet and get all words
      if (vocabularyService.switchSheet(sheetName)) {
        allData[sheetName] = [];
        
        // Get current word and iterate through sheet
        let word = vocabularyService.getCurrentWord();
        while (word) {
          allData[sheetName].push(word);
          vocabularyService.getNextWord();
          word = vocabularyService.getCurrentWord();
          
          // Safety check to avoid infinite loops
          if (allData[sheetName].length > 10000) break;
        }
        
        // Switch back to original sheet
        vocabularyService.switchSheet(originalSheet);
      }
    });
    
    return allData;
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
    updateWord,
    getAllVocabularyData
  };
};
