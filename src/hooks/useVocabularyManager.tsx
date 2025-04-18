
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';

export const useVocabularyManager = () => {
  const [hasData, setHasData] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const { toast } = useToast();

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const displayNextWord = useCallback(async () => {
    clearTimer();
    window.speechSynthesis.cancel();
    
    if (isPaused) return;
    
    const nextWord = vocabularyService.getNextWord();
    
    if (nextWord) {
      setCurrentWord(nextWord);
      timerRef.current = window.setTimeout(displayNextWord, 10000);
    } else {
      toast({
        title: "No vocabulary data",
        description: "Please upload an Excel file with vocabulary data.",
      });
    }
  }, [isPaused, clearTimer, toast]);

  useEffect(() => {
    const hasExistingData = vocabularyService.hasData();
    setHasData(hasExistingData);
    
    if (hasExistingData) {
      const word = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      setCurrentWord(word);
      
      if (!isPaused) {
        timerRef.current = window.setTimeout(displayNextWord, 2000);
      }
    }
    
    return () => {
      clearTimer();
      window.speechSynthesis.cancel();
    };
  }, [displayNextWord, isPaused, clearTimer]);

  const handleFileUploaded = () => {
    setHasData(true);
    const word = vocabularyService.getNextWord();
    setCurrentWord(word);
    
    if (!isPaused) {
      clearTimer();
      timerRef.current = window.setTimeout(displayNextWord, 1000);
    }
  };

  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
    window.speechSynthesis.cancel();
    
    if (isPaused) {
      displayNextWord();
    } else {
      clearTimer();
    }
  };

  const handleManualNext = () => {
    clearTimer();
    displayNextWord();
  };

  return {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    setHasData
  };
};
