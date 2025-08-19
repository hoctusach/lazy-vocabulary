
import * as React from 'react';
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking, formatSpeechText } from '@/utils/speech';
import { useTimeoutManager } from './speech/useTimeoutManager';
import { useWordStateManager } from './speech/useWordStateManager';
import { useSpeechSync } from './speech/useSpeechSync';

export const useWordSpeechSync = (
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  isMuted: boolean,
  isVoicesLoaded: boolean,
  speakText: (text: string) => Promise<string>,
  isSpeakingRef: React.MutableRefObject<boolean>,
  isChangingWordRef: React.MutableRefObject<boolean>
) => {
  const {
    speechTimeoutRef,
    autoRetryTimeoutRef,
    keepAliveIntervalRef,
    initialSpeakTimeoutRef,
    wordProcessingTimeoutRef,
    clearAllTimeouts
  } = useTimeoutManager();

  const {
    lastWordIdRef,
    wordFullySpoken,
    setWordFullySpoken,
    speakAttemptCountRef,
    currentWordRef,
    speechLockRef,
    wordChangeInProgressRef
  } = useWordStateManager(currentWord);

  const speakCurrentWord = async (forceSpeak = false) => {
    if (wordChangeInProgressRef.current && !forceSpeak) {
      console.log("Word change is in progress, delaying speech");
      return;
    }
    if (isPaused && !forceSpeak) {
      console.log("App is paused, stopping speech");
      stopSpeaking();
      return;
    }
    if (isMuted && !forceSpeak) {
      console.log("Speech is muted, stopping and not speaking");
      stopSpeaking();
      return;
    }
    if (speechLockRef.current && !forceSpeak) {
      console.log("Speech is locked, waiting to complete current word");
      return;
    }
    if (isChangingWordRef.current && !forceSpeak) {
      console.log("Word is changing, delaying speech");
      setTimeout(() => speakCurrentWord(false), 800);
      return;
    }

    const wordToSpeak = currentWordRef.current;
    if (!wordToSpeak) {
      console.log("Cannot speak current word: no word available");
      return;
    }
    if (!isVoicesLoaded) {
      console.log("Voices not loaded yet, cannot speak");
      return;
    }

    const wordId = wordToSpeak.word;
    if (lastWordIdRef.current === wordId && !forceSpeak && wordFullySpoken) {
      console.log("Word already spoken, skipping:", wordToSpeak.word);
      return;
    }

    if (forceSpeak) {
      stopSpeaking();
      clearAllTimeouts();
      setWordFullySpoken(false);
      speakAttemptCountRef.current = 0;
    }

    console.log("Starting to speak:", wordToSpeak.word);
    lastWordIdRef.current = wordId;
    speechLockRef.current = true;

    try {
      isSpeakingRef.current = true;
      try {
        localStorage.setItem('currentDisplayedWord', wordToSpeak.word);
      } catch {}
      const fullText = formatSpeechText({
        word: wordToSpeak.word,
        meaning: wordToSpeak.meaning,
        example: wordToSpeak.example
      });
      if (isPaused && !forceSpeak) {
        console.log("App was paused while preparing, aborting");
        isSpeakingRef.current = false;
        speechLockRef.current = false;
        return;
      }
      await speakText(fullText);
      console.log("Finished speaking word completely:", wordToSpeak.word);
      setWordFullySpoken(true);
      speakAttemptCountRef.current = 0;
    } catch (error) {
      console.error("Speech error:", error);
      if (speakAttemptCountRef.current < 5 && !isMuted && !isPaused) {
        speakAttemptCountRef.current++;
        console.log(`Speech attempt ${speakAttemptCountRef.current} failed, retrying...`);
        if (autoRetryTimeoutRef.current) clearTimeout(autoRetryTimeoutRef.current);
        autoRetryTimeoutRef.current = window.setTimeout(
          () => !isPaused && !isMuted && speakCurrentWord(true),
          300 * speakAttemptCountRef.current
        );
      } else if (speakAttemptCountRef.current >= 5) {
        console.log("Multiple speech attempts failed, marking word as spoken anyway");
        setWordFullySpoken(true);
        speakAttemptCountRef.current = 0;
      }
    } finally {
      isSpeakingRef.current = false;
      speechLockRef.current = false;
    }
  };

  const { resetSpeechSystem } = useSpeechSync(
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    isSpeakingRef,
    isChangingWordRef,
    keepAliveIntervalRef,
    clearAllTimeouts,
    speakCurrentWord,
    setWordFullySpoken,
    lastWordIdRef
  );

  // ─── This effect *drives* every speak on word-change ─────────
  useEffect(() => {
    if (isChangingWordRef.current) return;
    if (wordChangeInProgressRef.current) return;

    currentWordRef.current = currentWord;
    if (currentWord && lastWordIdRef.current !== currentWord.word) {
      wordChangeInProgressRef.current = true;
      setWordFullySpoken(false);
      lastWordIdRef.current = currentWord.word;

      stopSpeaking();
      clearAllTimeouts();
      try { localStorage.setItem('currentDisplayedWord', currentWord.word); } catch {}

      initialSpeakTimeoutRef.current = window.setTimeout(() => {
        initialSpeakTimeoutRef.current = null;
        wordProcessingTimeoutRef.current = window.setTimeout(() => {
          wordProcessingTimeoutRef.current = null;
          wordChangeInProgressRef.current = false;
          if (!isPaused && !isMuted && !isChangingWordRef.current) {
            console.log("Speaking new word after change:", currentWord.word);
            speakCurrentWord(true);
          }
        }, 400);
      }, 800);
    }
  }, [currentWord, isChangingWordRef, clearAllTimeouts, isPaused, isMuted]);
  // ───────────────────────────────────────────────────────────────

  return {
    speakCurrentWord,
    resetLastSpokenWord: resetSpeechSystem,
    wordFullySpoken
  };
};
