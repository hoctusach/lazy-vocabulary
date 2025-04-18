
import { useEffect, useRef, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useToast } from '@/hooks/use-toast';
import { stopSpeaking } from '@/utils/speechUtils';

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

  // Update current word ref whenever the prop changes
  useEffect(() => {
    currentWordRef.current = currentWord;
  }, [currentWord]);

  // Clear any pending speech timeouts
  const clearSpeechTimeout = () => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
  };

  // This function handles the actual speaking of the current word
  const speakCurrentWord = async (forceSpeak = false) => {
    const wordToSpeak = currentWordRef.current;
    
    // Stop if conditions aren't right for speaking
    if (!wordToSpeak || isMuted || !isVoicesLoaded) {
      console.log("Cannot speak current word:", 
        !wordToSpeak ? "no word" : 
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

    // Generate a unique ID for this word instance to prevent duplicates
    const wordId = `${wordToSpeak.word}-${Date.now()}`;
    
    // Don't speak the same word again unless forced
    if (lastWordIdRef.current === wordToSpeak.word && !forceSpeak) {
      console.log("Word already spoken, skipping:", wordToSpeak.word);
      return;
    }
    
    // Special case for replaying the current word
    if (forceSpeak) {
      // Cancel any previous speech
      stopSpeaking();
      clearSpeechTimeout();
      isSpeakingRef.current = false;
      lastWordIdRef.current = null;
      setWordFullySpoken(false);
      speakAttemptCountRef.current = 0;
    }
    
    // Log the start of speaking
    console.log("Starting to speak:", wordToSpeak.word);
    
    // Mark this word as the last one spoken
    lastWordIdRef.current = wordToSpeak.word;
    setWordFullySpoken(false);
    
    try {
      // Set speaking state before starting
      isSpeakingRef.current = true;
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Construct the text to be spoken
      const fullText = `${wordToSpeak.word}. ${wordToSpeak.meaning}. ${wordToSpeak.example}`;
      
      // Speak the text
      await speakText(fullText);
      
      // Add a small delay after speaking completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
        }, 500);
      }
    } finally {
      // Reset states after speaking completes or fails
      isSpeakingRef.current = false;
    }
  };

  // Effect for auto-speaking words with proper synchronization
  useEffect(() => {
    if (!currentWord || isPaused || isMuted || !isVoicesLoaded) {
      clearSpeechTimeout();
      return;
    }
    
    console.log("Word changed or conditions changed, preparing to speak:", 
      currentWord ? currentWord.word : "no word");
    
    // If conditions or word changed, make sure we're not in a stale state
    stopSpeaking();
    clearSpeechTimeout();
    
    // Wait for any UI updates before speaking
    speechTimeoutRef.current = window.setTimeout(() => {
      // Only speak if we're not in the middle of changing words
      if (!isChangingWordRef.current) {
        speakCurrentWord(true); // Force speak on change
      } else {
        // If we are changing words, retry after a short delay
        speechTimeoutRef.current = window.setTimeout(() => {
          speakCurrentWord(true);
        }, 500);
      }
    }, 300);
    
    return () => {
      clearSpeechTimeout();
    };
  }, [currentWord, isPaused, isMuted, isVoicesLoaded]);

  // Function to completely reset the speech system
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
