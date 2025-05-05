
import { useState, useEffect } from 'react';
import { VocabularyWord, SheetData } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';

export interface CustomWord {
  word: string;
  meaning: string;
  example: string;
  category: string;
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
    const wordWithCount = { ...newWord, count: 0 };
    
    // Update state with new word
    const updatedWords = [...customWords, wordWithCount];
    setCustomWords(updatedWords);
    
    // Save to localStorage
    localStorage.setItem('customWords', JSON.stringify(updatedWords));
    
    // Merge the new word into the vocabulary service
    mergeCustomWords([wordWithCount]);
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
      dataToMerge[word.category].push(word as VocabularyWord);
    });

    // Use the vocabulary service to merge the data
    vocabularyService.mergeCustomWords(dataToMerge);
  };

  return {
    customWords,
    addCustomWord
  };
};
