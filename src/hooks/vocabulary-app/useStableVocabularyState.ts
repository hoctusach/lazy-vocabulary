
import { useState, useCallback, useMemo, useRef } from 'react';
import { useUnifiedVocabularyController } from '@/hooks/vocabulary-controller/useUnifiedVocabularyController';
import { vocabularyService } from '@/services/vocabularyService';
import { useVoiceSettings } from '@/hooks/speech/useVoiceSettings';

export const useStableVocabularyState = () => {
  const [userInteractionState, setUserInteractionState] = useState({
    hasInitialized: false,
    interactionCount: 0,
    isAudioUnlocked: false
  });

  // Use stable reference for the unified controller
  const controllerState = useUnifiedVocabularyController();
  const { voiceRegion } = useVoiceSettings();

  // Memoize computed values to prevent recalculation
  const nextVoiceLabel = useMemo(() => {
    const regionVoices = controllerState.allVoices[voiceRegion] || [];
    if (regionVoices.length === 0) return 'Default';
    const index = regionVoices.findIndex(v => v.name === controllerState.selectedVoiceName);
    const nextIndex = (index + 1) % regionVoices.length;
    return regionVoices[nextIndex]?.name ?? 'Default';
  }, [controllerState.selectedVoiceName, controllerState.allVoices, voiceRegion]);

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
