
import { useState, useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { useCategoryNavigation } from './useCategoryNavigation';

export const useVocabularyContainerState = () => {
  console.log('[VOCAB-CONTAINER-STATE] === Hook Initialization ===');

  // File and data loading state
  const [hasData, setHasData] = useState(false);
  const [jsonLoadError, setJsonLoadError] = useState<string | null>(null);
  const [wordList, setWordList] = useState<VocabularyWord[]>([]);

  // Category navigation
  const { currentCategory, nextCategory } = useCategoryNavigation();

  // Display time for UI (can be customized later)
  const displayTime = 5000;

  // Load initial vocabulary data
  useEffect(() => {
    console.log('[VOCAB-CONTAINER-STATE] Loading initial vocabulary data');
    
    try {
      // Ensure vocabulary service is initialized with random selection
      const initialWordList = vocabularyService.getWordList();
      console.log('[VOCAB-CONTAINER-STATE] Initial word list:', {
        length: initialWordList.length,
        firstWord: initialWordList[0]?.word || 'none',
        sample: initialWordList.slice(0, 3).map(w => w.word)
      });

      setWordList(initialWordList);
      setHasData(initialWordList.length > 0);
      setJsonLoadError(null);
    } catch (error) {
      console.error('[VOCAB-CONTAINER-STATE] Error loading initial data:', error);
      setJsonLoadError('Failed to load vocabulary data');
      setHasData(false);
      setWordList([]);
    }
  }, []);

  // Subscribe to vocabulary service changes
  useEffect(() => {
    const handleVocabularyChange = () => {
      console.log('[VOCAB-CONTAINER-STATE] Vocabulary service updated');
      
      try {
        const updatedWordList = vocabularyService.getWordList();
        console.log('[VOCAB-CONTAINER-STATE] Updated word list length:', updatedWordList.length);
        
        setWordList(updatedWordList);
        setHasData(updatedWordList.length > 0);
        setJsonLoadError(null);
      } catch (error) {
        console.error('[VOCAB-CONTAINER-STATE] Error updating from service:', error);
        setJsonLoadError('Failed to update vocabulary data');
      }
    };

    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);

    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
    };
  }, []);

  // File upload handler
  const handleFileUploaded = useCallback(async (file: File) => {
    console.log('[VOCAB-CONTAINER-STATE] File uploaded:', file.name);
    
    try {
      setJsonLoadError(null);
      const success = await vocabularyService.processExcelFile(file);
      
      if (success) {
        const newWordList = vocabularyService.getWordList();
        console.log('[VOCAB-CONTAINER-STATE] File loaded successfully, words:', newWordList.length);
        setWordList(newWordList);
        setHasData(true);
      } else {
        setJsonLoadError('Failed to load vocabulary file');
        setHasData(false);
      }
    } catch (error) {
      console.error('[VOCAB-CONTAINER-STATE] File upload error:', error);
      setJsonLoadError(error instanceof Error ? error.message : 'Unknown error occurred');
      setHasData(false);
    }
  }, []);

  // Category switching handler
  const handleSwitchCategory = useCallback(() => {
    console.log('[VOCAB-CONTAINER-STATE] Switching category from:', currentCategory);
    
    try {
      const newCategory = vocabularyService.nextSheet();
      
      if (newCategory) {
        const newWordList = vocabularyService.getWordList();
        
        console.log('[VOCAB-CONTAINER-STATE] ✓ Category switched to:', newCategory);
        console.log('[VOCAB-CONTAINER-STATE] New word list length:', newWordList.length);
        
        setWordList(newWordList);
        setHasData(newWordList.length > 0);
        setJsonLoadError(null);
      } else {
        console.warn('[VOCAB-CONTAINER-STATE] Category switch failed');
        setJsonLoadError('Failed to switch category');
      }
    } catch (error) {
      console.error('[VOCAB-CONTAINER-STATE] Error switching category:', error);
      setJsonLoadError('Error switching category');
    }
  }, [currentCategory]);

  // Get vocabulary manager state for debugging
  const vocabularyManagerState = {
    hasData: vocabularyService.hasData(),
    currentWord: vocabularyService.getCurrentWord(),
    isPaused: false // This will be managed by the controller
  };

  console.log('[VOCAB-CONTAINER-STATE] Vocabulary manager state:', vocabularyManagerState);

  // Final state summary
  console.log('[VOCAB-CONTAINER-STATE] Final state summary:', {
    hasData,
    currentWord: vocabularyManagerState.currentWord?.word || 'none',
    wordListLength: wordList.length,
    currentCategory,
    isPaused: vocabularyManagerState.isPaused,
    isSoundPlaying: false
  });

  return {
    hasData,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime,
    wordList
  };
};
