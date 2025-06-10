
import { useState, useRef } from 'react';

/**
 * Simplified vocabulary manager for UI-specific state only
 * The main vocabulary state is now handled by useVocabularyController
 */
export const useSimpleVocabularyManager = () => {
  // UI-specific state only
  const [jsonLoadError, setJsonLoadError] = useState<string | null>(null);
  
  // References for UI state tracking
  const isSpeakingRef = useRef<boolean>(false);
  const isChangingWordRef = useRef<boolean>(false);

  return {
    // UI state
    jsonLoadError,
    setJsonLoadError,
    
    // UI refs
    isSpeakingRef,
    isChangingWordRef,
  };
};
