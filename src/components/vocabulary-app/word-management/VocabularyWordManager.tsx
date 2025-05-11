
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { toast } from 'sonner';

interface VocabularyWordManagerProps {
  currentWord: VocabularyWord;
  currentCategory: string;
  onWordSaved: () => void;
}

// Changed from class to object with methods
const VocabularyWordManager = ({ 
  currentWord, 
  currentCategory, 
  onWordSaved 
}: VocabularyWordManagerProps) => {
  const handleSaveWord = (
    wordData: { word: string; meaning: string; example: string; category: string },
    isEditMode: boolean,
    wordToEdit: VocabularyWord | null
  ) => {
    try {
      if (isEditMode && wordToEdit) {
        // Edit existing word - using mergeCustomWords since updateWord doesn't exist
        const updatedData = {
          [wordData.category || currentCategory]: [{
            word: wordData.word,
            meaning: wordData.meaning,
            example: wordData.example,
            count: wordToEdit.count || 1
          }]
        };
        
        // Use mergeCustomWords for updating
        vocabularyService.mergeCustomWords(updatedData);
        toast.success("Word updated successfully!");
      } else {
        // Add new word - using mergeCustomWords since addWord doesn't exist
        const newWordData = {
          [wordData.category || currentCategory]: [{
            word: wordData.word,
            meaning: wordData.meaning,
            example: wordData.example,
            count: 1
          }]
        };
        
        // Use mergeCustomWords for adding
        vocabularyService.mergeCustomWords(newWordData);
        toast.success("Word added successfully!");
      }
      
      // Close modal and notify parent
      onWordSaved();
    } catch (error) {
      console.error("Error saving word:", error);
      toast.error("Failed to save word");
    }
  };

  return { handleSaveWord };
};

export default VocabularyWordManager;
