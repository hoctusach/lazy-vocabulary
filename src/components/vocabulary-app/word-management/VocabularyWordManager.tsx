
import React from "react";
import { toast } from "sonner";
import { VocabularyWord } from "@/types/vocabulary";
import { vocabularyService } from "@/services/vocabularyService";

interface VocabularyWordManagerProps {
  currentWord: VocabularyWord | null;
  currentCategory: string;
  onWordSaved: () => void;
}

// This component handles all word management operations: add, edit, update, delete
const VocabularyWordManager: React.FC<VocabularyWordManagerProps> = ({ 
  currentWord,
  currentCategory,
  onWordSaved
}) => {
  // Helper function to add a word to a specific category
  const addWordToCategory = (category: string, word: VocabularyWord) => {
    try {
      // Get current words in the category
      let words = [];
      const storedWords = localStorage.getItem(category);
      if (storedWords) {
        words = JSON.parse(storedWords);
      }
      
      // Add the new word
      words.push(word);
      
      // Save back to localStorage
      localStorage.setItem(category, JSON.stringify(words));
    } catch (error) {
      console.error(`Failed to add word to category ${category}:`, error);
      toast.error(`Failed to add word to ${category}`);
    }
  };
  
  // Helper function to update a word in a specific category
  const updateWordInCategory = (category: string, updatedWord: VocabularyWord, oldWordText?: string) => {
    try {
      // Get current words in the category
      let words = [];
      const storedWords = localStorage.getItem(category);
      if (storedWords) {
        words = JSON.parse(storedWords);
      }
      
      // Find the word (if it exists)
      const wordToUpdate = oldWordText || updatedWord.word;
      const index = words.findIndex((w: VocabularyWord) => 
        w.word.toLowerCase() === wordToUpdate.toLowerCase());
      
      if (index >= 0) {
        // Update existing word
        words[index] = updatedWord;
      } else {
        // Word doesn't exist, add it
        words.push(updatedWord);
      }
      
      // Save back to localStorage
      localStorage.setItem(category, JSON.stringify(words));
    } catch (error) {
      console.error(`Failed to update word in category ${category}:`, error);
      toast.error(`Failed to update word in ${category}`);
    }
  };
  
  // Helper function to remove a word from a specific category
  const removeWordFromCategory = (category: string, wordToRemove: string) => {
    try {
      // Get current words in the category
      let words = [];
      const storedWords = localStorage.getItem(category);
      if (storedWords) {
        words = JSON.parse(storedWords);
      }
      
      // Filter out the word to remove
      words = words.filter((w: VocabularyWord) => 
        w.word.toLowerCase() !== wordToRemove.toLowerCase());
      
      // Save back to localStorage
      localStorage.setItem(category, JSON.stringify(words));
    } catch (error) {
      console.error(`Failed to remove word from category ${category}:`, error);
      toast.error(`Failed to remove word from ${category}`);
    }
  };

  // Handler for saving a new word or updating an existing word
  const handleSaveWord = (
    wordData: { word: string; meaning: string; example: string; category: string }, 
    isEditMode: boolean, 
    wordToEdit: VocabularyWord | null
  ) => {
    if (isEditMode && wordToEdit) {
      // Get the original category for comparison
      const originalCategory = wordToEdit.category || currentCategory;
      
      // Create word entry to update/add
      const updatedWord: VocabularyWord = {
        word: wordData.word,
        meaning: wordData.meaning,
        example: wordData.example,
        category: wordData.category,
        count: wordToEdit.count || 0
      };
      
      // Determine if category changed
      const categoryChanged = originalCategory !== wordData.category;
      
      // Update in All words category
      updateWordInCategory("All words", updatedWord, wordToEdit.word);
      
      // Handle category-specific updates
      if (categoryChanged) {
        // Remove from old category
        removeWordFromCategory(originalCategory, wordToEdit.word);
        // Add to new category
        addWordToCategory(wordData.category, updatedWord);
      } else {
        // Update in same category
        updateWordInCategory(wordData.category, updatedWord, wordToEdit.word);
      }
      
      // Show appropriate toast message
      const toastMessage = categoryChanged 
        ? `"${wordData.word}" updated and moved to ${wordData.category}`
        : `"${wordData.word}" updated in ${wordData.category}`;
      
      toast.success(toastMessage, {
        description: `The word has been updated in All words and ${wordData.category}.`
      });
    } else {
      // Creating a new word entry
      const newWord: VocabularyWord = {
        word: wordData.word,
        meaning: wordData.meaning,
        example: wordData.example,
        category: wordData.category,
        count: 0
      };
      
      // Add to All words category
      addWordToCategory("All words", newWord);
      
      // Add to specific category
      addWordToCategory(wordData.category, newWord);
      
      // Show success notification
      toast.success(`"${wordData.word}" added to ${wordData.category}`, {
        description: `The word has been added to All words and ${wordData.category}.`
      });
    }
    
    // Refresh the vocabulary service to see the changes immediately
    vocabularyService.loadDefaultVocabulary();
    
    // Notify parent component
    onWordSaved();
  };

  return {
    handleSaveWord,
  };
};

export default VocabularyWordManager;
