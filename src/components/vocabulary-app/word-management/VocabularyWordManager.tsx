
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { toast } from 'sonner';

interface VocabularyWordManagerProps {
  currentWord: VocabularyWord;
  currentCategory: string;
  onWordSaved: () => void;
}

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
        // Edit existing word
        vocabularyService.updateWord({
          originalWord: wordToEdit.word,
          updatedWord: {
            word: wordData.word,
            meaning: wordData.meaning,
            example: wordData.example,
            category: wordData.category || currentCategory,
            count: wordToEdit.count || 1
          }
        });
        toast.success("Word updated successfully!");
      } else {
        // Add new word
        vocabularyService.addWord({
          word: wordData.word,
          meaning: wordData.meaning,
          example: wordData.example,
          category: wordData.category || currentCategory,
          count: 1
        });
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
