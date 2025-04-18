
import { useEffect, useRef } from 'react';
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
  const lastSpokenWordId = useRef<string | null>(null);
  const { toast } = useToast();

  const speakCurrentWord = async () => {
    if (!currentWord || isMuted || !isVoicesLoaded || isChangingWordRef.current) {
      console.log("Cannot speak current word:", 
        !currentWord ? "no word" : 
        isMuted ? "muted" : 
        !isVoicesLoaded ? "voices not loaded" : 
        "word is changing");
      return;
    }
    
    const wordId = currentWord.word;
    
    if (wordId === lastSpokenWordId.current) {
      console.log("Word already spoken, skipping:", wordId);
      return;
    }
    
    lastSpokenWordId.current = wordId;
    
    try {
      // Set speaking state before starting
      isSpeakingRef.current = true;
      isChangingWordRef.current = true;
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Construct the text to be spoken
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
      console.log("Starting to speak:", currentWord.word);
      
      // Speak the text
      await speakText(fullText);
      
      // Add a small delay after speaking completes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log("Finished speaking word completely");
    } catch (error) {
      console.error("Speech error:", error);
    } finally {
      // Reset states after speaking completes
      isSpeakingRef.current = false;
      isChangingWordRef.current = false;
    }
  };

  // Effect for auto-speaking words with proper synchronization
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && isVoicesLoaded && !isChangingWordRef.current) {
      const timer = setTimeout(() => {
        speakCurrentWord();
      }, 300); // Increased delay for better synchronization
      
      return () => clearTimeout(timer);
    }
  }, [currentWord, isPaused, isMuted, isVoicesLoaded]);

  return {
    speakCurrentWord,
    resetLastSpokenWord: () => {
      lastSpokenWordId.current = null;
      isSpeakingRef.current = false;
      isChangingWordRef.current = false;
    }
  };
};
