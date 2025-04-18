
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
  const lastWordIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const speechTimeoutRef = useRef<number | null>(null);
  const [wordFullySpoken, setWordFullySpoken] = useState(false);
  const speakAttemptCountRef = useRef(0);

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
    
    // Skip if we're already changing words unless forced
    if (isChangingWordRef.current && !forceSpeak) {
      console.log("Word is changing, cannot speak yet");
      return;
    }

    // Generate a unique ID for this word instance
    const wordId = `${currentWord.word}-${Date.now()}`;
    
    // Don't speak the same word again unless forced
    if (lastWordIdRef.current === currentWord.word && !forceSpeak) {
      console.log("Word already spoken, skipping:", currentWord.word);
      return;
    }
    
    // Special case for replaying the current word
    if (forceSpeak) {
      // Cancel any previous speech
      window.speechSynthesis.cancel();
      clearSpeechTimeout();
      isSpeakingRef.current = false;
      lastWordIdRef.current = null;
      setWordFullySpoken(false);
      speakAttemptCountRef.current = 0;
    }
    
    // Log the start of speaking
    console.log("Starting to speak:", currentWord.word);
    
    // Mark this word as the last one spoken
    lastWordIdRef.current = currentWord.word;
    setWordFullySpoken(false);
    
    try {
      // Set speaking state before starting
      isSpeakingRef.current = true;
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Construct the text to be spoken
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
      
      // Speak the text
      await speakText(fullText);
      
      // Add a small delay after speaking completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("Finished speaking word completely");
      setWordFullySpoken(true);
    } catch (error) {
      console.error("Speech error:", error);
      
      // If we've tried a few times and still failed, mark as complete to prevent hanging
      if (speakAttemptCountRef.current >= 2) {
        console.log("Multiple speech attempts failed, marking word as spoken anyway");
        setWordFullySpoken(true);
        speakAttemptCountRef.current = 0;
      } else {
        // Try again after a short delay
        speakAttemptCountRef.current++;
        speechTimeoutRef.current = window.setTimeout(() => {
          speakCurrentWord(true);
        }, 1000);
      }
    } finally {
      // Reset states after speaking completes or fails
      isSpeakingRef.current = false;
    }
  };

  // Effect for auto-speaking words with proper synchronization
  useEffect(() => {
    if (!currentWord || isPaused || isMuted || !isVoicesLoaded) {
      return () => {
        clearSpeechTimeout();
      };
    }
    
    console.log("Word changed or conditions changed, preparing to speak:", 
      currentWord ? currentWord.word : "no word");
    
    // Wait for any UI updates before speaking
    clearSpeechTimeout();
    speechTimeoutRef.current = window.setTimeout(() => {
      // Only speak if we're not in the middle of changing words
      if (!isChangingWordRef.current) {
        speakCurrentWord();
      } else {
        // If we are changing words, retry after a short delay
        speechTimeoutRef.current = window.setTimeout(() => {
          speakCurrentWord();
        }, 1000);
      }
    }, 500);
    
    return () => {
      clearSpeechTimeout();
    };
  }, [currentWord, isPaused, isMuted, isVoicesLoaded]);

  // Function to completely reset the speech system
  const resetSpeechSystem = () => {
    window.speechSynthesis.cancel();
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
