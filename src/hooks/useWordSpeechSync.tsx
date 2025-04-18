
import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    currentWordRef.current = currentWord;
    if (currentWord && lastWordIdRef.current !== currentWord.word) {
      setWordFullySpoken(false);
    }
  }, [currentWord]);

  const clearSpeechTimeout = () => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
  };

  const speakCurrentWord = async (forceSpeak = false) => {
    const wordToSpeak = currentWordRef.current;
    
    if (!wordToSpeak || (!forceSpeak && isMuted) || !isVoicesLoaded) {
      console.log("Cannot speak current word:", 
        !wordToSpeak ? "no word" : 
        isMuted && !forceSpeak ? "muted" : 
        !isVoicesLoaded ? "voices not loaded" : 
        "unknown reason");
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
      isSpeakingRef.current = false;
      setWordFullySpoken(false);
      speakAttemptCountRef.current = 0;
    }
    
    console.log("Starting to speak:", wordToSpeak.word);
    
    lastWordIdRef.current = wordId;
    setWordFullySpoken(false);
    
    try {
      if (isMuted && !forceSpeak) {
        console.log("Speech is muted, not actually speaking");
        setWordFullySpoken(true);
        return;
      }
      
      isSpeakingRef.current = true;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const fullText = `${wordToSpeak.word}. ${wordToSpeak.meaning}. ${wordToSpeak.example}`;
      
      await speakText(fullText);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("Finished speaking word completely");
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
          speakCurrentWord(true);
        }, 500);
      }
    } finally {
      isSpeakingRef.current = false;
    }
  };

  useEffect(() => {
    if (!currentWord || isPaused || !isVoicesLoaded) {
      clearSpeechTimeout();
      if (isPaused) {
        stopSpeaking(); // Stop any ongoing speech when paused
      }
      return;
    }
    
    console.log("Word changed or conditions changed, preparing to speak:", 
      currentWord ? currentWord.word : "no word",
      "isPaused:", isPaused,
      "isMuted:", isMuted);
    
    stopSpeaking();
    clearSpeechTimeout();
    
    speechTimeoutRef.current = window.setTimeout(() => {
      if (!isChangingWordRef.current) {
        speakCurrentWord(!isMuted);
      } else {
        speechTimeoutRef.current = window.setTimeout(() => {
          speakCurrentWord(!isMuted);
        }, 500);
      }
    }, 300);
    
    return () => {
      clearSpeechTimeout();
    };
  }, [currentWord, isPaused, isMuted, isVoicesLoaded]);

  const resetSpeechSystem = () => {
    stopSpeaking();
    clearSpeechTimeout();
    lastWordIdRef.current = null;
    isSpeakingRef.current = false;
    setWordFullySpoken(false);
    speakAttemptCountRef.current = 0;
  };

  return {
    speakCurrentWord: (forceSpeak = false) => speakCurrentWord(forceSpeak),
    resetLastSpokenWord: resetSpeechSystem,
    wordFullySpoken
  };
};
