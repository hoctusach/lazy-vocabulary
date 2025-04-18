
import { useEffect, useRef, useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking } from '@/utils/speech';

export const useWordSpeechSync = (
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  isMuted: boolean,
  isVoicesLoaded: boolean,
  speakText: (text: string) => Promise<void>,
  isSpeakingRef: React.MutableRefObject<boolean>,
  isChangingWordRef: React.MutableRefObject<boolean>
) => {
  const lastWordIdRef = useRef<string | null>(null);
  const speechTimeoutRef = useRef<number | null>(null);
  const [wordFullySpoken, setWordFullySpoken] = useState(false);
  const speakAttemptCountRef = useRef(0);
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const speechLockRef = useRef(false);
  const isPausedRef = useRef(isPaused);
  const isMutedRef = useRef(isMuted);
  const autoRetryTimeoutRef = useRef<number | null>(null);

  // Update refs when props change
  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused) {
      stopSpeaking();
      clearAllTimeouts();
    }
  }, [isPaused]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted) {
      stopSpeaking();
    }
  }, [isMuted]);

  useEffect(() => {
    currentWordRef.current = currentWord;
    if (currentWord && lastWordIdRef.current !== currentWord.word) {
      console.log("Word changed in speech sync:", currentWord.word);
      setWordFullySpoken(false);
      lastWordIdRef.current = currentWord.word;
    }
  }, [currentWord]);

  const clearAllTimeouts = useCallback(() => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    
    if (autoRetryTimeoutRef.current !== null) {
      window.clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
  }, []);

  const speakCurrentWord = useCallback(async (forceSpeak = false) => {
    if (isPausedRef.current && !forceSpeak) {
      console.log("App is paused, stopping speech");
      stopSpeaking();
      return;
    }
    
    if (isMutedRef.current && !forceSpeak) {
      console.log("Speech is muted, stopping and not speaking");
      stopSpeaking();
      return;
    }
    
    if (speechLockRef.current && !forceSpeak) {
      console.log("Speech is locked, waiting to complete current word");
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
    
    if (isChangingWordRef.current && !forceSpeak) {
      console.log("Word is changing, cannot speak yet");
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
      if (isMutedRef.current) {
        console.log("Speech is muted, not actually speaking");
        setWordFullySpoken(true);
        speechLockRef.current = false;
        return;
      }
      
      isSpeakingRef.current = true;
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fullText = `${wordToSpeak.word}. ${wordToSpeak.meaning}. ${wordToSpeak.example}`;
      
      if (isPausedRef.current || isMutedRef.current) {
        console.log("App was paused or muted while preparing to speak, aborting");
        isSpeakingRef.current = false;
        speechLockRef.current = false;
        return;
      }
      
      try {
        await speakText(fullText);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        console.log("Finished speaking word completely:", wordToSpeak.word);
        setWordFullySpoken(true);
        speakAttemptCountRef.current = 0;
      } catch (error) {
        console.error("Speech error:", error);
        
        // Auto-retry logic for failed speech
        if (speakAttemptCountRef.current < 3 && !isMutedRef.current && !isPausedRef.current) {
          speakAttemptCountRef.current++;
          console.log(`Speech attempt ${speakAttemptCountRef.current} failed, retrying...`);
          
          // Create auto-retry with exponential backoff
          if (autoRetryTimeoutRef.current) {
            clearTimeout(autoRetryTimeoutRef.current);
          }
          
          autoRetryTimeoutRef.current = window.setTimeout(() => {
            if (!isPausedRef.current && !isMutedRef.current) {
              console.log("Auto-retrying speech...");
              speakCurrentWord(true);
            }
          }, 200 * speakAttemptCountRef.current); // Increasing delay with each attempt
          
        } else if (speakAttemptCountRef.current >= 3) {
          console.log("Multiple speech attempts failed, marking word as spoken anyway");
          setWordFullySpoken(true);
          speakAttemptCountRef.current = 0;
        }
      }
      
    } catch (generalError) {
      console.error("Unexpected error in speech system:", generalError);
    } finally {
      isSpeakingRef.current = false;
      speechLockRef.current = false;
    }
  }, [clearAllTimeouts, isVoicesLoaded, speakText]);

  useEffect(() => {
    if (!currentWord || isPaused || !isVoicesLoaded || isMuted) {
      clearAllTimeouts();
      if (isPaused || isMuted) {
        stopSpeaking();
      }
      return;
    }
    
    console.log("Word or conditions changed, preparing to speak:", 
      currentWord ? currentWord.word : "no word",
      "isPaused:", isPaused,
      "isMuted:", isMuted);
    
    stopSpeaking();
    clearAllTimeouts();
    
    if (!isChangingWordRef.current && !isMuted) {
      speechTimeoutRef.current = window.setTimeout(() => {
        speakCurrentWord();
      }, 100);
    }
    
    return () => {
      clearAllTimeouts();
    };
  }, [currentWord, isPaused, isMuted, isVoicesLoaded, clearAllTimeouts, speakCurrentWord]);

  const resetSpeechSystem = useCallback(() => {
    stopSpeaking();
    clearAllTimeouts();
    lastWordIdRef.current = null;
    isSpeakingRef.current = false;
    setWordFullySpoken(false);
    speakAttemptCountRef.current = 0;
    speechLockRef.current = false;
  }, [clearAllTimeouts]);

  return {
    speakCurrentWord,
    resetLastSpokenWord: resetSpeechSystem,
    wordFullySpoken
  };
};
