
import { useEffect, useRef, useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking, keepSpeechAlive } from '@/utils/speech';

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
  const keepAliveIntervalRef = useRef<number | null>(null);
  const initialSpeakTimeoutRef = useRef<number | null>(null);
  const wordChangeInProgressRef = useRef(false);

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

  // More careful handling of word changes to prevent desynchronization
  useEffect(() => {
    if (isChangingWordRef.current) {
      // If word is changing, don't update yet to prevent race conditions
      console.log("Word changing flag active, delaying word update");
      return;
    }
    
    if (wordChangeInProgressRef.current) {
      console.log("Word change in progress, skipping");
      return;
    }
    
    currentWordRef.current = currentWord;
    
    if (currentWord && lastWordIdRef.current !== currentWord.word) {
      // Mark that we're handling a word change
      wordChangeInProgressRef.current = true;
      
      console.log("Word changed in speech sync:", currentWord.word);
      setWordFullySpoken(false);
      lastWordIdRef.current = currentWord.word;
      
      // Cancel any previous speech and timeouts 
      stopSpeaking();
      clearAllTimeouts();
      
      // Wait longer before speaking the new word to ensure complete change
      if (initialSpeakTimeoutRef.current) {
        clearTimeout(initialSpeakTimeoutRef.current);
      }
      
      initialSpeakTimeoutRef.current = window.setTimeout(() => {
        initialSpeakTimeoutRef.current = null;
        wordChangeInProgressRef.current = false;
        if (!isPausedRef.current && !isMutedRef.current && !isChangingWordRef.current) {
          console.log("Speaking new word after change:", currentWord.word);
          speakCurrentWord(true);
        }
      }, 800); // Longer delay before speaking new word
    }
  }, [currentWord, isChangingWordRef]);

  const clearAllTimeouts = useCallback(() => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    
    if (autoRetryTimeoutRef.current !== null) {
      window.clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
    
    if (keepAliveIntervalRef.current !== null) {
      window.clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    
    if (initialSpeakTimeoutRef.current !== null) {
      window.clearTimeout(initialSpeakTimeoutRef.current);
      initialSpeakTimeoutRef.current = null;
    }
  }, []);

  // Setup keep-alive mechanism specific to this hook's speech
  useEffect(() => {
    // Clear old interval if it exists
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    
    // Set up new interval with more frequent checks
    keepAliveIntervalRef.current = window.setInterval(() => {
      if (isSpeakingRef.current && !isPausedRef.current && !isMutedRef.current) {
        keepSpeechAlive();
      }
    }, 25); // Much more frequent checks to prevent cutting off
    
    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  }, [isSpeakingRef]);

  // More robust speech function
  const speakCurrentWord = useCallback(async (forceSpeak = false) => {
    if (wordChangeInProgressRef.current && !forceSpeak) {
      console.log("Word change is in progress, delaying speech");
      return;
    }
    
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
    
    if (isChangingWordRef.current && !forceSpeak) {
      console.log("Word is changing, delaying speech");
      setTimeout(() => speakCurrentWord(false), 500); // Try again after delay
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
      if (isMutedRef.current) {
        console.log("Speech is muted, not actually speaking");
        setWordFullySpoken(true);
        speechLockRef.current = false;
        return;
      }
      
      isSpeakingRef.current = true;
      
      // Longer delay before speaking to ensure clean start
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Store current word in localStorage for sync checking
      try {
        localStorage.setItem('currentDisplayedWord', wordToSpeak.word);
      } catch (error) {
        console.error('Error storing current word:', error);
      }
      
      const fullText = `${wordToSpeak.word}. ${wordToSpeak.meaning}. ${wordToSpeak.example}`;
      
      if (isPausedRef.current || isMutedRef.current) {
        console.log("App was paused or muted while preparing to speak, aborting");
        isSpeakingRef.current = false;
        speechLockRef.current = false;
        return;
      }
      
      try {
        // Start the keep-alive interval for this specific speech
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }
        
        keepAliveIntervalRef.current = window.setInterval(() => {
          if (isSpeakingRef.current) {
            keepSpeechAlive();
          } else {
            clearInterval(keepAliveIntervalRef.current as number);
            keepAliveIntervalRef.current = null;
          }
        }, 20); // Even more frequent to prevent cutting off
        
        // Actually speak the text
        await speakText(fullText);
        
        // Longer delay after speech to ensure full completion
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log("Finished speaking word completely:", wordToSpeak.word);
        setWordFullySpoken(true);
        speakAttemptCountRef.current = 0;
      } catch (error) {
        console.error("Speech error:", error);
        
        // Auto-retry logic for failed speech with more aggressive retries
        if (speakAttemptCountRef.current < 4 && !isMutedRef.current && !isPausedRef.current) {
          speakAttemptCountRef.current++;
          console.log(`Speech attempt ${speakAttemptCountRef.current} failed, retrying...`);
          
          // Create auto-retry with shorter backoff
          if (autoRetryTimeoutRef.current) {
            clearTimeout(autoRetryTimeoutRef.current);
          }
          
          autoRetryTimeoutRef.current = window.setTimeout(() => {
            if (!isPausedRef.current && !isMutedRef.current) {
              console.log("Auto-retrying speech...");
              speakCurrentWord(true);
            }
          }, 200 * speakAttemptCountRef.current); // Shorter delays for quicker recovery
          
        } else if (speakAttemptCountRef.current >= 4) {
          console.log("Multiple speech attempts failed, marking word as spoken anyway");
          setWordFullySpoken(true);
          speakAttemptCountRef.current = 0;
        }
      } finally {
        // Clear the keep-alive interval when speech is done
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
      }
      
    } catch (generalError) {
      console.error("Unexpected error in speech system:", generalError);
    } finally {
      isSpeakingRef.current = false;
      speechLockRef.current = false;
    }
  }, [clearAllTimeouts, isVoicesLoaded, speakText]);

  // Handle mounting and cleanup
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
      // Longer delay before initial speech
      speechTimeoutRef.current = window.setTimeout(() => {
        speakCurrentWord(true); // Force speak on initial load
      }, 700);
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
    wordChangeInProgressRef.current = false;
  }, [clearAllTimeouts]);

  return {
    speakCurrentWord,
    resetLastSpokenWord: resetSpeechSystem,
    wordFullySpoken
  };
};
