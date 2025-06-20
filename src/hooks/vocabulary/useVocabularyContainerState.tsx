
import { useState, useEffect, useCallback } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { useCategoryNavigation } from './useCategoryNavigation';

export const useVocabularyContainerState = () => {
  console.log('[VOCAB-CONTAINER-STATE] === Hook Initialization ===');

  // File and data loading state
  const [hasData, setHasData] = useState(false); // data in current category
  const [hasAnyData, setHasAnyData] = useState(false); // data in any category
  const [jsonLoadError, setJsonLoadError] = useState<string | null>(null);

  // Category navigation
  const { currentCategory, nextCategory } = useCategoryNavigation();

  // Display time for UI (can be customized later)
  const displayTime = 5000;

  // Load initial vocabulary info
  useEffect(() => {
    console.log('[VOCAB-CONTAINER-STATE] Loading initial vocabulary info');

    try {
      const list = vocabularyService.getWordList();
      console.log('[VOCAB-CONTAINER-STATE] Initial word count:', list.length);
      setHasData(list.length > 0);
      setHasAnyData(vocabularyService.hasData());
      setJsonLoadError(null);
    } catch (error) {
      console.error('[VOCAB-CONTAINER-STATE] Error loading initial data:', error);
      setJsonLoadError('Failed to load vocabulary data');
      setHasData(false);
      setHasAnyData(false);
    }
  }, []);

  // Subscribe to vocabulary service changes
  useEffect(() => {
    const handleVocabularyChange = () => {
      console.log('[VOCAB-CONTAINER-STATE] Vocabulary service updated');

      try {
        const list = vocabularyService.getWordList();
        console.log('[VOCAB-CONTAINER-STATE] Updated word count:', list.length);

        setHasData(list.length > 0);
        setHasAnyData(vocabularyService.hasData());
        setJsonLoadError(null);
      } catch (error) {
        console.error('[VOCAB-CONTAINER-STATE] Error updating from service:', error);
        setJsonLoadError('Failed to update vocabulary data');
      }
    };

    // Use the correct method name from VocabularyService
    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);

    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
    };
  }, []);

  // File upload handler - fix signature to match expected type
  const handleFileUploaded = useCallback(async (file: File) => {
    console.log('[VOCAB-CONTAINER-STATE] File uploaded:', file.name);
    
    try {
      setJsonLoadError(null);
      // Use the correct method name from VocabularyService
      const success = await vocabularyService.processExcelFile(file);
      
      if (success) {
        const list = vocabularyService.getWordList();
        console.log('[VOCAB-CONTAINER-STATE] File loaded successfully, words:', list.length);
        setHasData(list.length > 0);
        setHasAnyData(vocabularyService.hasData());
      } else {
        setJsonLoadError('Failed to load vocabulary file');
        setHasData(false);
        setHasAnyData(vocabularyService.hasData());
      }
    } catch (error) {
      console.error('[VOCAB-CONTAINER-STATE] File upload error:', error);
      setJsonLoadError(error instanceof Error ? error.message : 'Unknown error occurred');
      setHasData(false);
      setHasAnyData(vocabularyService.hasData());
    }
  }, []);

  // Category switching handler - use correct method
  const handleSwitchCategory = useCallback(() => {
    console.log('[VOCAB-CONTAINER-STATE] Switching category from:', currentCategory);
    
    try {
      // Use the correct method name from VocabularyService
      const newCategory = vocabularyService.nextSheet();
      
      if (newCategory) {
        const list = vocabularyService.getWordList();

        console.log('[VOCAB-CONTAINER-STATE] ✓ Category switched to:', newCategory);
        console.log('[VOCAB-CONTAINER-STATE] New word count:', list.length);

        setHasData(list.length > 0);
        setHasAnyData(vocabularyService.hasData());
        
        // Clear any previous errors since category switch was successful
        setJsonLoadError(null);
      } else {
        console.warn('[VOCAB-CONTAINER-STATE] Category switch failed');
        setJsonLoadError('Failed to switch category');
        setHasAnyData(vocabularyService.hasData());
      }
    } catch (error) {
      console.error('[VOCAB-CONTAINER-STATE] Error switching category:', error);
      setJsonLoadError('Error switching category');
      setHasAnyData(vocabularyService.hasData());
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
    currentCategory,
    isPaused: vocabularyManagerState.isPaused,
    isSoundPlaying: false
  });

  return {
    hasData,
    hasAnyData,
    handleFileUploaded,
    jsonLoadError,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    displayTime
  };
};
