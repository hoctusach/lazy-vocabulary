
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking } from '@/utils/speech';
import { useTimeoutManager } from './speech/useTimeoutManager';
import { useWordStateManager } from './speech/useWordStateManager';

export const useWordSpeechSync = (
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  isMuted: boolean,
  isVoicesLoaded: boolean,
  speakText: (text: string) => Promise<void>,
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
  };


  // Handle word changes
  useEffect(() => {
    if (isChangingWordRef.current) {
      console.log("Word changing flag active, delaying word update");
      return;
    }
    
    if (wordChangeInProgressRef.current) {
      console.log("Word change in progress, skipping");
      return;
    }
    
    currentWordRef.current = currentWord;
    
    if (currentWord && lastWordIdRef.current !== currentWord.word) {
      wordChangeInProgressRef.current = true;
      
      console.log("Word changed in speech sync:", currentWord.word);
      setWordFullySpoken(false);
      lastWordIdRef.current = currentWord.word;
      
      stopSpeaking();
      clearAllTimeouts();
      
      if (initialSpeakTimeoutRef.current) {
        clearTimeout(initialSpeakTimeoutRef.current);
      }
      
      try {
        localStorage.setItem('currentDisplayedWord', currentWord.word);
      } catch (error) {
        console.error('Error storing current displayed word:', error);
      }
      
      initialSpeakTimeoutRef.current = window.setTimeout(() => {
        initialSpeakTimeoutRef.current = null;
        
        if (wordProcessingTimeoutRef.current) {
          clearTimeout(wordProcessingTimeoutRef.current);
        }
        
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

  // We’ll just stopSpeech + clear timeouts on reset:
  const resetLastSpokenWord = () => {
   stopSpeaking();
   clearAllTimeouts();
   lastWordIdRef.current = null;
   setWordFullySpoken(false);
 };

 return {
  speakCurrentWord,
  resetLastSpokenWord,
  wordFullySpoken
 };
};
