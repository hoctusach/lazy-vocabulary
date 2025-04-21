import React, { useRef, useEffect, useCallback } from "react";
import { useVocabularyManager } from "@/hooks/useVocabularyManager";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useWordSpeechSync } from "@/hooks/useWordSpeechSync";
import { vocabularyService } from "@/services/vocabularyService";
import VocabularyCard from "@/components/VocabularyCard";
import WelcomeScreen from "@/components/WelcomeScreen";
import FileUpload from "@/components/FileUpload"; // We'll stop using this to hide upload UI
import VocabularyLayout from "@/components/VocabularyLayout";
import {
  stopSpeaking,
  keepSpeechAlive,
  ensureSpeechEngineReady,
  extractMainWord,
  forceResyncIfNeeded
} from "@/utils/speech";
import { useBackgroundColor } from "./useBackgroundColor";
import { useVocabularyAppHandlers } from "./useVocabularyAppHandlers";

const VocabularyAppContainer: React.FC = () => {
  const syncCheckTimeoutRef = useRef<number | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const resyncTimeoutRef = useRef<number | null>(null);
  const resetIntervalRef = useRef<number | null>(null);
  const initialRenderRef = useRef(true);
  const stateChangeDebounceRef = useRef<number | null>(null);

  // We'll keep default state, but block toggle to upload view by only showing word card:
  const [showWordCard, setShowWordCard] = React.useState(true);

  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
    isSpeakingRef,
    isChangingWordRef
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    speakingRef,
    getCurrentText
  } = useSpeechSynthesis();

  const {
    speakCurrentWord,
    resetLastSpokenWord
  } = useWordSpeechSync(
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    speakText,
    isSpeakingRef,
    isChangingWordRef
  );

  const { backgroundColor, advanceColor, backgroundColorIndex, setBackgroundColorIndex, backgroundColors } = useBackgroundColor();

  const currentSheetName = vocabularyService.getCurrentSheetName();
  const nextSheetIndex = (vocabularyService.sheetOptions.indexOf(currentSheetName) + 1) % vocabularyService.sheetOptions.length;
  const nextSheetName = vocabularyService.sheetOptions[nextSheetIndex];

  const clearAllTimeouts = useCallback(() => {
    if (syncCheckTimeoutRef.current) {
      clearTimeout(syncCheckTimeoutRef.current);
      syncCheckTimeoutRef.current = null;
    }
    if (resyncTimeoutRef.current) {
      clearTimeout(resyncTimeoutRef.current);
      resyncTimeoutRef.current = null;
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (resetIntervalRef.current) {
      clearInterval(resetIntervalRef.current);
      resetIntervalRef.current = null;
    }
    if (stateChangeDebounceRef.current) {
      clearTimeout(stateChangeDebounceRef.current);
      stateChangeDebounceRef.current = null;
    }
  }, []);

  // Handlers (mute, voice, switch category)
  const {
    handleToggleMuteWithSpeaking,
    handleChangeVoiceWithSpeaking,
    handleSwitchCategoryWithState
  } = useVocabularyAppHandlers({
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
  });

  const handleNextWordClick = useCallback(() => {
    clearAllTimeouts();
    stopSpeaking();
    resetLastSpokenWord();

    handleManualNext();

    setTimeout(() => {
      if
