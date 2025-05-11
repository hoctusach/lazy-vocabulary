
import { useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { speak, stopSpeaking } from '@/utils/speech';
import { 
  useAudioStateManager, 
  useAudioCleanup, 
  useAudioEffect, 
  usePauseEffect, 
  useAudioMuteEffect 
} from '@/hooks/audio';

export const useAudioPlayback = (
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  mute: boolean,
  voiceRegion: 'US' | 'UK',
  handleManualNext: () => void,
  isSoundPlaying: boolean,
  setIsSoundPlaying: (playing: boolean) => void,
  clearAutoAdvanceTimer: () => void,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>,
  lastSpokenWordRef: React.MutableRefObject<string | null>,
  wordChangeProcessingRef: React.MutableRefObject<boolean>,
  speechAttemptsRef: React.MutableRefObject<number>,
  stopSpeaking: () => void,
  displayTime: number,
  pauseRequestedRef?: React.MutableRefObject<boolean>
) => {
  // Use our extracted hooks for different aspects of audio playback
  const { clearAllAudioState } = useAudioCleanup(
    clearAutoAdvanceTimer, 
    stopSpeaking, 
    setIsSoundPlaying
  );

  // Main audio playback effect
  useAudioEffect(
    currentWord,
    isPaused,
    mute,
    voiceRegion,
    handleManualNext,
    isSoundPlaying,
    setIsSoundPlaying,
    clearAutoAdvanceTimer,
    autoAdvanceTimerRef,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    stopSpeaking,
    displayTime,
    pauseRequestedRef
  );
  
  // Pause/unpause effect
  usePauseEffect(
    isPaused,
    mute,
    currentWord,
    stopSpeaking,
    clearAutoAdvanceTimer,
    setIsSoundPlaying,
    pauseRequestedRef,
    wordChangeProcessingRef,
    lastSpokenWordRef
  );
  
  // Mute effect
  useAudioMuteEffect(
    mute,
    stopSpeaking,
    setIsSoundPlaying
  );
};
