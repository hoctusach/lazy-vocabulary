import { useEffect, useRef, useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const speechTimeoutRef = useRef<number | null>(null);
  const [wordFullySpoken, setWordFullySpoken] = useState(false);
  const speakAttemptCountRef = useRef(0);
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const speechLockRef = useRef(false);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused) {
      stopSpeaking();
      clearSpeechTimeout();
    }
  }, [isPaused]);

  useEffect(() => {
    currentWordRef.current = currentWord;
    if (currentWord && lastWordIdRef.current !== currentWord.word) {
      console.log("Word changed in speech sync:", currentWord.word);
      setWordFullySpoken(false);
      lastWordIdRef.current = currentWord.word;
      
      if (currentWord.word && currentWord.meaning) {
        toast({
          title: currentWord.word,
          description: `${currentWord.meaning}${currentWord.example ? `\n\nExample: ${currentWord.example}` : ''}`,
          duration: 6000,
        });
      }
    }
  }, [currentWord, toast]);

  const clearSpeechTimeout = useCallback(() => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
  }, []);

  const speakCurrentWord = useCallback(async (forceSpeak = false) => {
    if (isPausedRef.current && !forceSpeak) {
      console.log("App is paused, stopping speech");
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
    
    if (!forceSpeak && isMuted) {
      console.log("Speech is muted, not speaking");
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
      clearSpeechTimeout();
      setWordFullySpoken(false);
      speakAttemptCountRef.current = 0;
    }
    
    console.log("Starting to speak:", wordToSpeak.word);
    
    lastWordIdRef.current = wordId;
    speechLockRef.current = true;
    
    try {
      if (isMuted && !forceSpeak) {
        console.log("Speech is muted, not actually speaking");
        setWordFullySpoken(true);
        speechLockRef.current = false;
        return;
      }
      
      isSpeakingRef.current = true;
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fullText = `${wordToSpeak.word}. ${wordToSpeak.meaning}. ${wordToSpeak.example}`;
      
      if (isPausedRef.current) {
        console.log("App was paused while preparing to speak, aborting");
        isSpeakingRef.current = false;
        speechLockRef.current = false;
        return;
      }
      
      await speakText(fullText);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log("Finished speaking word completely:", wordToSpeak.word);
      setWordFullySpoken(true);
    } catch (error) {
      console.error("Speech error:", error);
      
      if (speakAttemptCountRef.current >= 2) {
        console.log("Multiple speech attempts failed, marking word as spoken anyway");
        setWordFullySpoken(true);
        speakAttemptCountRef.current = 0;
      } else {
        speakAttemptCountRef.current++;
        speechTimeoutRef.current = window.setTimeout(() => {
          if (!isPausedRef.current) {
            speakCurrentWord(true);
          }
        }, 200);
      }
    } finally {
      isSpeakingRef.current = false;
      speechLockRef.current = false;
    }
  }, [clearSpeechTimeout, isMuted, isVoicesLoaded, speakText]);

  useEffect(() => {
    if (!currentWord || isPaused || !isVoicesLoaded) {
      clearSpeechTimeout();
      if (isPaused) {
        stopSpeaking();
      }
      return;
    }
    
    console.log("Word or conditions changed, preparing to speak:", 
      currentWord ? currentWord.word : "no word",
      "isPaused:", isPaused,
      "isMuted:", isMuted);
    
    stopSpeaking();
    clearSpeechTimeout();
    
    if (!isChangingWordRef.current && !isMuted) {
      speechTimeoutRef.current = window.setTimeout(() => {
        speakCurrentWord();
      }, 100);
    }
    
    return () => {
      clearSpeechTimeout();
    };
  }, [currentWord, isPaused, isMuted, isVoicesLoaded, clearSpeechTimeout, speakCurrentWord]);

  const resetSpeechSystem = useCallback(() => {
    stopSpeaking();
    clearSpeechTimeout();
    lastWordIdRef.current = null;
    isSpeakingRef.current = false;
    setWordFullySpoken(false);
    speakAttemptCountRef.current = 0;
    speechLockRef.current = false;
  }, [clearSpeechTimeout]);

  return {
    speakCurrentWord,
    resetLastSpokenWord: resetSpeechSystem,
    wordFullySpoken
  };
};
