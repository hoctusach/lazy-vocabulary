
import { useUnifiedVocabularyController } from './useUnifiedVocabularyController';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * @deprecated Use useUnifiedVocabularyController instead
 * This hook is kept for backward compatibility but will be removed
 */
export const useVocabularyController = (wordList: VocabularyWord[]) => {
  console.warn('[DEPRECATED] useVocabularyController is deprecated. Use useUnifiedVocabularyController instead.');
  
  // Delegate to the unified controller
  const unifiedState = useUnifiedVocabularyController();
  
  return {
    ...unifiedState,
    currentIndex: 0, // Legacy compatibility
    goToPrevious: unifiedState.goToNext, // Legacy compatibility
    wordCount: wordList.length // Legacy compatibility
  };
};
