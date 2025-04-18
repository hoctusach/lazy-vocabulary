
import { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useToast } from '@/hooks/use-toast';
import { vocabularyService } from '@/services/vocabularyService';

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
    
    const wordId = `${currentWord.word}-${Date.now()}`;
    
    if (wordId === lastSpokenWordId.current) {
      console.log("Word already spoken, skipping:", wordId);
      return;
    }
    
    lastSpokenWordId.current = wordId;
    
    const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
    
    console.log("Speaking vocabulary:", currentWord.word);
    
    try {
      isSpeakingRef.current = true;
      await new Promise(resolve => setTimeout(resolve, 300));
      await speakText(fullText);
      console.log("Finished speaking word completely");
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error("Speech error:", error);
    } finally {
      isSpeakingRef.current = false;
    }
  };

  // Effect for auto-speaking words
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && isVoicesLoaded && !isChangingWordRef.current) {
      const timer = setTimeout(() => {
        speakCurrentWord();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [currentWord, isPaused, isMuted, isVoicesLoaded]);

  return {
    speakCurrentWord,
    resetLastSpokenWord: () => lastSpokenWordId.current = null
  };
};
