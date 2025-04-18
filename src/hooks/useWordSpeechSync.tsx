
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
  const lastSpeakActionTimeRef = useRef<number>(0);

  useEffect(() => {
    currentWordRef.current = currentWord;
    if (currentWord && lastWordIdRef.current !== currentWord.word) {
      console.log("Word changed in speech sync:", currentWord.word);
      setWordFullySpoken(false);
      lastWordIdRef.current = currentWord.word;
    }
  }, [currentWord]);

  const clearSpeechTimeout = useCallback(() => {
    if (speechTimeoutRef.current !== null) {
      console.log("Clearing speech timeout");
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
  }, []);

  const speakCurrentWord = useCallback(async (forceSpeak = false) => {
    // Add timestamp for this speak attempt
    const speakActionTime = Date.now();
    lastSpeakActionTimeRef.current = speakActionTime;
    
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
      console.log("Force speaking word:", wordToSpeak.word);
      stopSpeaking();
      clearSpeechTimeout();
      setWordFullySpoken(false);
      speakAttemptCountRef.current = 0;
    }
    
    console.log("Starting to speak:", wordToSpeak.word);
    
    lastWordIdRef.current = wordId;
    speechLockRef.current = true;
    
    try {
      // Check if a newer speak action has been requested
      if (lastSpeakActionTimeRef.current !== speakActionTime) {
        console.log("Newer speak action received, abandoning this one");
        speechLockRef.current = false;
        return;
      }
      
      if (isMuted && !forceSpeak) {
        console.log("Speech is muted, not actually speaking");
        setWordFullySpoken(true);
        speechLockRef.current = false;
        return;
      }
      
      isSpeakingRef.current = true;
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Build the full text with proper spacing
      const fullText = `${wordToSpeak.word}. ${wordToSpeak.meaning}. ${wordToSpeak.example}`;
      
      console.log("Speaking full text for word:", wordToSpeak.word);
      await speakText(fullText);
      
      // Small delay after speech completion
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log("Finished speaking word completely:", wordToSpeak.word);
      setWordFullySpoken(true);
      
      // Show a toast notification for word completion
      toast({
        title: "Word Spoken",
        description: `Completed: ${wordToSpeak.word}`,
        duration: 2000
      });
    } catch (error) {
      console.error("Speech error:", error);
      
      // Check if a newer speak action has been requested
      if (lastSpeakActionTimeRef.current !== speakActionTime) {
        console.log("Newer speak action received after error, abandoning retry");
        speechLockRef.current = false;
        isSpeakingRef.current = false;
        return;
      }
      
      if (speakAttemptCountRef.current >= 2) {
        console.log("Multiple speech attempts failed, marking word as spoken anyway");
        setWordFullySpoken(true);
        speakAttemptCountRef.current = 0;
        
        toast({
          title: "Speech Error",
          description: "Could not speak the word after multiple attempts",
          variant: "destructive"
        });
      } else {
        speakAttemptCountRef.current++;
        console.log(`Speech attempt failed, retrying (attempt ${speakAttemptCountRef.current})`);
        
        speechTimeoutRef.current = window.setTimeout(() => {
          speakCurrentWord(true);
        }, 800); // Increased retry delay
      }
    } finally {
      isSpeakingRef.current = false;
      speechLockRef.current = false;
    }
  }, [clearSpeechTimeout, isMuted, isVoicesLoaded, speakText, toast]);

  useEffect(() => {
    if (!currentWord || isPaused || !isVoicesLoaded) {
      clearSpeechTimeout();
      if (isPaused) {
        console.log("App is paused, stopping any ongoing speech");
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
      console.log("Scheduling word to be spoken after short delay");
      speechTimeoutRef.current = window.setTimeout(() => {
        speakCurrentWord();
      }, 500); // Increased delay for more reliable speech
    }
    
    return () => {
      clearSpeechTimeout();
    };
  }, [currentWord, isPaused, isMuted, isVoicesLoaded, clearSpeechTimeout, speakCurrentWord]);

  const resetSpeechSystem = useCallback(() => {
    console.log("Resetting speech system");
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
