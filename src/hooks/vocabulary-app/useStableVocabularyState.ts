
import { useState, useCallback, useMemo } from 'react';
import { useUnifiedVocabularyController } from '@/hooks/vocabulary-controller/useUnifiedVocabularyController';
import type { DailySelection } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';

export const useStableVocabularyState = (
  initialWords?: VocabularyWord[],
  selection?: DailySelection | null
) => {
  const [userInteractionState, setUserInteractionState] = useState({
    hasInitialized: false,
    interactionCount: 0,
    isAudioUnlocked: false
  });

  // Use stable reference for the unified controller
  const controllerState = useUnifiedVocabularyController(initialWords, selection);
  
  // Memoize computed values to prevent recalculation
  const nextVoiceLabel = useMemo(() => {
    if (controllerState.allVoices.length === 0) return 'Default';
    const index = controllerState.allVoices.findIndex(v => v.name === controllerState.selectedVoiceName);
    const nextIndex = (index + 1) % controllerState.allVoices.length;
    return controllerState.allVoices[nextIndex].name;
  }, [controllerState.selectedVoiceName, controllerState.allVoices]);

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
    handleInteractionUpdate
  };
};
