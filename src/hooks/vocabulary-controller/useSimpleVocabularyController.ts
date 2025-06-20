
import { useUnifiedVocabularyController } from './useUnifiedVocabularyController';

/**
 * @deprecated Use useUnifiedVocabularyController instead
 * This hook is kept for backward compatibility but will be removed
 */
export const useSimpleVocabularyController = () => {
  console.warn('[DEPRECATED] useSimpleVocabularyController is deprecated. Use useUnifiedVocabularyController instead.');
  
  // Delegate to the unified controller
  return useUnifiedVocabularyController();
};
