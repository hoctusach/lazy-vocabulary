
import { useEffect, useRef, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useToast } from '@/hooks/use-toast';

export const useWordSpeechSync = (
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  isMuted: boolean,
  isVoicesLoaded: boolean,
  speakText: (text: string) => Promise<void>,
  isSpeakingRef: React.MutableRefObject<boolean>,
  isChangingWordRef: React.MutableRefObject<boolean>
) => {
  const lastSpokenWordRef = useRef<string | null>(null);
  const { toast } = useToast();
  const speechTimeoutRef = useRef<number | null>(null);
  const [wordFullySpoken, setWordFullySpoken] = useState(false);

  // Clear any pending speech timeouts
  const clearSpeechTimeout = () => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
  };

  // This function handles the actual speaking of the current word
  const speakCurrentWord = async (forceSpeak = false) => {
    // Stop if conditions aren't right for speaking
    if (!currentWord || isMuted || !isVoicesLoaded) {
      console.log("Cannot speak current word:", 
        !currentWord ? "no word" : 
        isMuted ? "muted" : 
        !isVoicesLoaded ? "voices not loaded" : 
        "unknown reason");
      return;
    }
    
    // Don't speak if we're already changing words unless forced
    if (isChangingWordRef.current && !forceSpeak) {
      console.log("Word is changing, cannot speak yet");
      return;
    }

    // Special case for replaying the current word
    if (forceSpeak) {
      // Cancel any previous speech
      window.speechSynthesis.cancel();
      clearSpeechTimeout();
      // Reset states to ensure we can speak again
      isSpeakingRef.current = false;
      isChangingWordRef.current = false;
      lastSpokenWordRef.current = null;
      setWordFullySpoken(false);
    }
    
    const wordId = `${currentWord.word}-${Date.now()}`;
    
    // Don't speak the same word twice unless forced
    if (currentWord.word === lastSpokenWordRef.current && !forceSpeak) {
      console.log("Word already spoken, skipping:", currentWord.word);
      return;
    }
    
    // Mark this word as the last one spoken
    lastSpokenWordRef.current = currentWord.word;
    setWordFullySpoken(false);
    
    try {
      // Set speaking state before starting
      isSpeakingRef.current = true;
      isChangingWordRef.current = true;
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Construct the text to be spoken
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
      console.log("Starting to speak:", currentWord.word);
      
      // Speak the text
      await speakText(fullText);
      
      // Add a small delay after speaking completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("Finished speaking word completely");
      setWordFullySpoken(true);
    } catch (error) {
      console.error("Speech error:", error);
      setWordFullySpoken(true); // Mark as complete even on error to prevent hanging
    } finally {
      // Reset states after speaking completes
      isSpeakingRef.current = false;
      isChangingWordRef.current = false;
    }
  };

  // Effect for auto-speaking words with proper synchronization
  useEffect(() => {
    if (!currentWord || isPaused || isMuted || !isVoicesLoaded || isChangingWordRef.current) {
      return () => {
        clearSpeechTimeout();
      };
    }
    
    // Wait for any UI updates before speaking
    clearSpeechTimeout();
    speechTimeoutRef.current = window.setTimeout(() => {
      speakCurrentWord();
    }, 500);
    
    return () => {
      clearSpeechTimeout();
    };
  }, [currentWord, isPaused, isMuted, isVoicesLoaded]);

  // Function to completely reset the speech system
  const resetSpeechSystem = () => {
    window.speechSynthesis.cancel();
    clearSpeechTimeout();
    lastSpokenWordRef.current = null;
    isSpeakingRef.current = false;
    isChangingWordRef.current = false;
    setWordFullySpoken(false);
  };

  return {
    speakCurrentWord: (forceSpeak = false) => speakCurrentWord(forceSpeak),
    resetLastSpokenWord: resetSpeechSystem,
    wordFullySpoken
  };
};
