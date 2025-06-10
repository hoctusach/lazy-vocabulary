
import { useCallback, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { toast } from 'sonner';

/**
 * Data loading and file upload management
 */
export const useVocabularyData = (
  setWordList: (words: VocabularyWord[]) => void,
  setCurrentIndex: (index: number) => void,
  setHasData: (hasData: boolean) => void
) => {
  // Load vocabulary data using the correct method
  const loadVocabularyData = useCallback(async () => {
    try {
      const data = vocabularyService.getWordList();
      console.log('[VOCAB-DATA] Loaded vocabulary data:', data.length, 'words');
      
      setWordList(data);
      setCurrentIndex(0);
      setHasData(data.length > 0);
      
      if (data.length > 0) {
        console.log('[VOCAB-DATA] Setting first word:', data[0].word);
      }
    } catch (error) {
      console.error('[VOCAB-DATA] Error loading vocabulary:', error);
      toast.error('Failed to load vocabulary data');
      setWordList([]);
      setHasData(false);
    }
  }, [setWordList, setCurrentIndex, setHasData]);

  // Handle file upload using existing vocabulary service methods
  const handleFileUploaded = useCallback(async (uploadedWords: VocabularyWord[]) => {
    console.log('[VOCAB-DATA] Handling file upload:', uploadedWords.length, 'words');
    
    try {
      // Create custom data structure and merge it
      const customData = { 'Custom Words': uploadedWords };
      vocabularyService.mergeCustomWords(customData);
      
      // Get updated word list
      const updatedData = vocabularyService.getWordList();
      setWordList(updatedData);
      setCurrentIndex(0);
      setHasData(updatedData.length > 0);
      
      toast.success(`Successfully loaded ${uploadedWords.length} words`);
      
      if (updatedData.length > 0) {
        console.log('[VOCAB-DATA] Setting first word after upload:', updatedData[0].word);
      }
    } catch (error) {
      console.error('[VOCAB-DATA] Error handling file upload:', error);
      toast.error('Failed to process uploaded file');
    }
  }, [setWordList, setCurrentIndex, setHasData]);

  // Listen to vocabulary service changes
  useEffect(() => {
    const handleVocabularyChange = () => {
      console.log('[VOCAB-DATA] Vocabulary service updated');
      const updatedData = vocabularyService.getWordList();
      setWordList(updatedData);
      setHasData(updatedData.length > 0);
      // Reset to first word when vocabulary changes
      setCurrentIndex(0);
    };

    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);
    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
    };
  }, [setWordList, setHasData, setCurrentIndex]);

  // Initialize on mount
  useEffect(() => {
    loadVocabularyData();
  }, [loadVocabularyData]);

  return {
    loadVocabularyData,
    handleFileUploaded
  };
};
