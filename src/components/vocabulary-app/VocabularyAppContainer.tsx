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

  const {
    backgroundColor,
    advanceColor,
    backgroundColorIndex,
    setBackgroundColorIndex,
    backgroundColors
  } = useBackgroundColor();

  const currentSheetName = vocabularyService.getCurrentSheetName();
  const nextSheetIndex =
    (vocabularyService.sheetOptions.indexOf(currentSheetName) + 1) %
    vocabularyService.sheetOptions.length;
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
      if (!isMuted && !isPaused) {
        speakCurrentWord(true);
      }
    }, 1200);
  }, [
    isMuted,
    isPaused,
    handleManualNext,
    resetLastSpokenWord,
    speakCurrentWord,
    clearAllTimeouts
  ]);

  const toggleView = useCallback(() => {
    // Disabled toggling to upload view to hide upload section
    // setShowWordCard(prev => !prev);
  }, []);

  // Initial speak on first render
  useEffect(() => {
    if (
      initialRenderRef.current &&
      currentWord &&
      !isPaused &&
      !isMuted &&
      isVoicesLoaded
    ) {
      initialRenderRef.current = false;

      if (currentWord.word) {
        try {
          localStorage.setItem("currentDisplayedWord", currentWord.word);
        } catch (error) {
          console.error("Error storing initial word:", error);
        }
      }

      const timer = setTimeout(() => {
        console.log(
          "Initial render, force speaking current word:",
          currentWord.word
        );
        resetLastSpokenWord();
        stopSpeaking();

        setTimeout(() => {
          speakCurrentWord(true);
        }, 1500);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    resetLastSpokenWord,
    speakCurrentWord
  ]);

  // Keep-alive and ensure-ready loops
  useEffect(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }

    keepAliveIntervalRef.current = window.setInterval(() => {
      if (speakingRef.current && !isPaused && !isMuted) {
        keepSpeechAlive();
      }
    }, 10);

    if (resetIntervalRef.current) {
      clearInterval(resetIntervalRef.current);
    }

    resetIntervalRef.current = window.setInterval(() => {
      if (!speakingRef.current && !isPaused) {
        ensureSpeechEngineReady();
      }
    }, 60000);

    return () => {
      clearAllTimeouts();
    };
  }, [speakingRef, isPaused, isMuted, clearAllTimeouts]);

  // Sync-check loop
  useEffect(() => {
    const checkSyncAndFix = () => {
      if (!currentWord || isPaused || isMuted) {
        if (syncCheckTimeoutRef.current) {
          clearTimeout(syncCheckTimeoutRef.current);
          syncCheckTimeoutRef.current = null;
        }
        return;
      }

      const currentTextBeingSpoken = getCurrentText();

      if (
        currentTextBeingSpoken &&
        currentWord &&
        speakingRef.current
      ) {
        const mainWord = extractMainWord(currentWord.word);
        const spokenText = currentTextBeingSpoken.toLowerCase();

        console.log(
          `Sync check: Word="${mainWord}", Speaking=${speakingRef.current}, Changing=${isChangingWordRef.current}`
        );

        forceResyncIfNeeded(
          currentWord.word,
          currentTextBeingSpoken,
          () => {
            console.log(
              "Resync needed, restarting speech for word:",
              currentWord.word
            );
            if (!resyncTimeoutRef.current) {
              resyncTimeoutRef.current = window.setTimeout(() => {
                resyncTimeoutRef.current = null;
                if (currentWord && !isPaused && !isMuted) {
                  resetLastSpokenWord();
                  speakCurrentWord(true);
                }
              }, 600);
            }
          }
        );
      }

      if (syncCheckTimeoutRef.current) {
        clearTimeout(syncCheckTimeoutRef.current);
      }
      syncCheckTimeoutRef.current = window.setTimeout(
        checkSyncAndFix,
        1000
      );
    };

    if (syncCheckTimeoutRef.current) {
      clearTimeout(syncCheckTimeoutRef.current);
    }
    syncCheckTimeoutRef.current = window.setTimeout(
      checkSyncAndFix,
      2000
    );

    return () => {
      if (syncCheckTimeoutRef.current) {
        clearTimeout(syncCheckTimeoutRef.current);
        syncCheckTimeoutRef.current = null;
      }
    };
  }, [
    currentWord,
    isPaused,
    isMuted,
    getCurrentText,
    speakCurrentWord,
    speakingRef,
    isChangingWordRef,
    resetLastSpokenWord
  ]);

  // Reflect speaking state into isSpeakingRef
  useEffect(() => {
    isSpeakingRef.current = speakingRef.current;
  }, [speakingRef.current, isSpeakingRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      stopSpeaking();
    };
  }, [clearAllTimeouts]);
  useEffect(() => {
    if (
      !initialRenderRef.current &&
      wordFullySpoken &&
      !isPaused &&
      !isMuted
    ) {
      handleManualNext();
    }
  }, [wordFullySpoken, isPaused, isMuted, handleManualNext]);

  return (
    <VocabularyLayout
      showWordCard={showWordCard}
      hasData={hasData}
      onToggleView={toggleView}
    >
      {currentWord && hasData && showWordCard ? (
        <VocabularyCard
          word={currentWord.word}
          meaning={currentWord.meaning}
          example={currentWord.example}
          backgroundColor={backgroundColor}
          isMuted={isMuted}
          isPaused={isPaused}
          voiceRegion={voiceRegion}
          onToggleMute={handleToggleMuteWithSpeaking}
          onTogglePause={handleTogglePause}
          onChangeVoice={handleChangeVoiceWithSpeaking}
          onSwitchCategory={handleSwitchCategoryWithState}
          currentCategory={currentSheetName}
          nextCategory={nextSheetName}
          isSpeaking={isSpeakingRef.current}
          onNextWord={handleNextWordClick}
        />
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
