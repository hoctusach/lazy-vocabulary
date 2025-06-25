
import { useState, useCallback, useMemo, useRef } from 'react';
import { useUnifiedVocabularyController } from '@/hooks/vocabulary-controller/useUnifiedVocabularyController';
import { vocabularyService } from '@/services/vocabularyService';

export const useStableVocabularyState = () => {
  const [userInteractionState, setUserInteractionState] = useState({
    hasInitialized: false,
    interactionCount: 0,
    isAudioUnlocked: false
  });

  // Use stable reference for the unified controller
  const controllerState = useUnifiedVocabularyController();
  
  // Memoize computed values to prevent recalculation
  const nextVoiceLabel = useMemo(() => 
    controllerState.voiceRegion === 'UK' ? 'US' : 
    controllerState.voiceRegion === 'US' ? 'AU' : 'UK'
  , [controllerState.voiceRegion]);

  const nextCategory = useMemo(() => {
    const sheets = vocabularyService.getAllSheetNames();
    const currentIndex = sheets.indexOf(controllerState.currentCategory);
    const nextIndex = (currentIndex + 1) % sheets.length;
    return sheets[nextIndex] || 'Next';
  }, [controllerState.currentCategory]);

  // Stable callback for user interaction updates
  const handleInteractionUpdate = useCallback((newState: typeof userInteractionState) => {
    setUserInteractionState(prev => {
      if (prev.hasInitialized === newState.hasInitialized && 
          prev.interactionCount === newState.interactionCount &&
          prev.isAudioUnlocked === newState.isAudioUnlocked) {
        return prev; // No change
      }
      return newState;
    });
  }, []);

  return {
    ...controllerState,
    userInteractionState,
    nextVoiceLabel,
    nextCategory,
    handleInteractionUpdate
  };
};
