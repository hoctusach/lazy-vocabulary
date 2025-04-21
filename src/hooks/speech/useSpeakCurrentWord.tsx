
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking } from '@/utils/speech';

export interface SpeakCurrentWordDeps {
  isPaused: boolean;
  isMuted: boolean;
  isVoicesLoaded: boolean;
  speakText: (text: string) => Promise<void>;
  isSpeakingRef: React.MutableRefObject<boolean>;
  isChangingWordRef: React.MutableRefObject<boolean>;
  clearAllTimeouts: () => void;
  setWordFullySpoken: (val: boolean) => void;
  wordChangeInProgressRef: React.MutableRefObject<boolean>;
  currentWordRef: React.MutableRefObject<VocabularyWord | null>;
  lastWordIdRef: React.MutableRefObject<string | null>;
  wordFullySpoken: boolean;
  speakAttemptCountRef: React.MutableRefObject<number>;
  speechLockRef: React.MutableRefObject<boolean>;
  autoRetryTimeoutRef: React.MutableRefObject<number | null>;
}

/**
 * Exposes the speakCurrentWord function and all retry error handling.
 */
export function useSpeakCurrentWord(deps: SpeakCurrentWordDeps) {
  const {
    isPaused, isMuted, isVoicesLoaded, speakText, isSpeakingRef, isChangingWordRef, clearAllTimeouts, setWordFullySpoken,
    wordChangeInProgressRef, currentWordRef, lastWordIdRef, wordFullySpoken, speakAttemptCountRef, speechLockRef, autoRetryTimeoutRef
  } = deps;

  const speakCurrentWord = useCallback(async (forceSpeak = false) => {
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
      if (isMuted) {
        console.log("Speech is muted, not actually speaking");
        setWordFullySpoken(true);
        speechLockRef.current = false;
        return;
      }

      isSpeakingRef.current = true;

      try {
        localStorage.setItem('currentDisplayedWord', wordToSpeak.word);
      } catch (error) {
        console.error('Error storing current word:', error);
      }

      const fullText = `${wordToSpeak.word}. ${wordToSpeak.meaning}. ${wordToSpeak.example}`;

      if (isPaused || isMuted) {
        console.log("App was paused or muted while preparing to speak, aborting");
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

        if (autoRetryTimeoutRef.current) {
          clearTimeout(autoRetryTimeoutRef.current);
        }

        autoRetryTimeoutRef.current = window.setTimeout(() => {
          if (!isPaused && !isMuted) {
            console.log("Auto-retrying speech...");
            speakCurrentWord(true);
          }
        }, 300 * speakAttemptCountRef.current);

      } else if (speakAttemptCountRef.current >= 5) {
        console.log("Multiple speech attempts failed, marking word as spoken anyway");
        setWordFullySpoken(true);
        speakAttemptCountRef.current = 0;
      }
    } finally {
      isSpeakingRef.current = false;
      speechLockRef.current = false;
    }
  }, [
    isPaused, isMuted, isVoicesLoaded, speakText, isSpeakingRef, isChangingWordRef, clearAllTimeouts, setWordFullySpoken,
    wordChangeInProgressRef, currentWordRef, lastWordIdRef, wordFullySpoken, speakAttemptCountRef, speechLockRef, autoRetryTimeoutRef
  ]);

  return { speakCurrentWord };
}
