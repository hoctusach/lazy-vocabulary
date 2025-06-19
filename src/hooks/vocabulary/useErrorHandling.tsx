
import { useState, useCallback } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { toast } from 'sonner';

export const useErrorHandling = (setHasData: (hasData: boolean) => void, setCurrentWord: (word: any) => void) => {
  const [jsonLoadError, setJsonLoadError] = useState<boolean>(false);

  const handleVocabularyError = useCallback((error: Error) => {
    console.error("Error processing vocabulary file:", error);
    setJsonLoadError(true);
    
    // Attempt to load default vocabulary instead
    try {
      vocabularyService.loadDefaultVocabulary();
      setHasData(true);
      
      const firstWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      setCurrentWord(firstWord);
      
      toast.error("Custom vocabulary file is corrupt", {
        description: "Loaded default vocabulary list instead."
      });
    } catch (fallbackError) {
      console.error("Failed to load default vocabulary:", fallbackError);
    }
  }, [setHasData, setCurrentWord]);

  return {
    jsonLoadError,
    setJsonLoadError,
    handleVocabularyError
  };
};
