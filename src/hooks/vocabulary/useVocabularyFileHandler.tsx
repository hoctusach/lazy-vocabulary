
import { useCallback } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';

interface UseVocabularyFileHandlerParams {
  originalHandleFileUploaded: () => Promise<void>;
  setHasData: (hasData: boolean) => void;
  setCurrentWord: (word: VocabularyWord) => void;
  setJsonLoadError: (error: boolean) => void;
  handleVocabularyError: (error: Error) => void;
}

export const useVocabularyFileHandler = ({
  originalHandleFileUploaded,
  setHasData,
  setCurrentWord,
  setJsonLoadError,
  handleVocabularyError
}: UseVocabularyFileHandlerParams) => {
  
  const handleFileUploaded = useCallback((file?: File) => {
    try {
      // Call originalHandleFileUploaded and properly attach the catch handler to the returned Promise
      originalHandleFileUploaded()
        .catch(error => handleVocabularyError(error));
    } catch (outerError) {
      console.error("Error in file upload handler:", outerError);
      setJsonLoadError(true);
      
      // Try loading default vocabulary
      vocabularyService.loadDefaultVocabulary();
      setHasData(true);
      
      const firstWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      setCurrentWord(firstWord);
    }
  }, [originalHandleFileUploaded, setHasData, setCurrentWord, handleVocabularyError, setJsonLoadError]);

  return {
    handleFileUploaded
  };
};
