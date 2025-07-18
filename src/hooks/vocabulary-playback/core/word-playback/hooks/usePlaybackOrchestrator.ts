
import * as React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { useOrchestratorCore } from './useOrchestratorCore';

/**
 * Simplified orchestrator that delegates to the core orchestrator logic
 */
export const usePlaybackOrchestrator = (
  wordList: VocabularyWord[],
  currentIndex: number,
  muted: boolean,
  paused: boolean,
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: (fromUser?: boolean) => void,
  scheduleAutoAdvance: (delay: number) => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>,
  voicesLoadedRef: React.MutableRefObject<boolean>,
  ensureVoicesLoaded: () => Promise<boolean>
) => {
  // Use the core orchestrator that handles all the complex logic
  return useOrchestratorCore(
    wordList,
    currentIndex,
    muted,
    paused,
    findVoice,
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport,
    wordTransitionRef,
    goToNextWord,
    scheduleAutoAdvance,
    lastManualActionTimeRef,
    autoAdvanceTimerRef,
    voicesLoadedRef,
    ensureVoicesLoaded
  );
};
