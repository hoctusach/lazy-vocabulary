
import { useCallback } from "react";
import { stopSpeaking, keepSpeechAlive, ensureSpeechEngineReady, extractMainWord, forceResyncIfNeeded } from "@/utils/speech";
import { vocabularyService } from '@/services/vocabularyService';

export function useVocabularyAppHandlers({
  speakingRef,
  syncCheckTimeoutRef,
  keepAliveIntervalRef,
  resetIntervalRef,
  resyncTimeoutRef,
  stateChangeDebounceRef,
  clearAllTimeouts,
  getCurrentText,
  isPaused,
  isMuted,
  isVoicesLoaded,
  resetLastSpokenWord,
  speakCurrentWord,
  isChangingWordRef,
  currentWord,
  handleToggleMute,
  handleChangeVoice,
  handleSwitchCategory,
  voiceRegion,
  setBackgroundColorIndex,
  backgroundColors
}: any) {
  // See original VocabularyApp, returns callback handlers

  const handleToggleMuteWithSpeaking = useCallback(() => {
    clearAllTimeouts();
    stopSpeaking();
    const wasMuted = isMuted;
    handleToggleMute();

    if (wasMuted && currentWord) {
      setTimeout(() => {
        resetLastSpokenWord();
        speakCurrentWord(true);
      }, 800);
    } else if (!wasMuted) {
      resetLastSpokenWord();
    }
  }, [isMuted, currentWord, handleToggleMute, resetLastSpokenWord, speakCurrentWord, clearAllTimeouts]);

  const handleChangeVoiceWithSpeaking = useCallback(() => {
    clearAllTimeouts();
    stopSpeaking();
    resetLastSpokenWord();
    handleChangeVoice();

    if (!isMuted && currentWord) {
      setTimeout(() => {
        speakCurrentWord(true);
      }, 1200);
    }
  }, [isMuted, currentWord, handleChangeVoice, resetLastSpokenWord, speakCurrentWord, clearAllTimeouts]);

  const handleSwitchCategoryWithState = useCallback(() => {
    clearAllTimeouts();
    stopSpeaking();
    resetLastSpokenWord();

    setBackgroundColorIndex((prevIndex: number) => (prevIndex + 1) % backgroundColors.length);
    handleSwitchCategory(isMuted, voiceRegion);

    setTimeout(() => {
      if (!isMuted && !isPaused) {
        speakCurrentWord(true);
      }
    }, 1500);
  }, [isMuted, voiceRegion, isPaused, handleSwitchCategory, resetLastSpokenWord, speakCurrentWord, clearAllTimeouts, setBackgroundColorIndex, backgroundColors.length]);

  return {
    handleToggleMuteWithSpeaking,
    handleChangeVoiceWithSpeaking,
    handleSwitchCategoryWithState,
  };
}
