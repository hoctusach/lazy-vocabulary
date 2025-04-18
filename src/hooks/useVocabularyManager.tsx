
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';

export const useVocabularyManager = () => {
  const [hasData, setHasData] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const { toast } = useToast();

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const displayNextWord = useCallback(async () => {
    // Don't schedule next word if we're currently speaking
    if (isSpeakingRef.current) {
      console.log("Speech is in progress, delaying next word");
      return;
    }
    
    clearTimer();
    window.speechSynthesis.cancel();
    
    if (isPaused) return;
    
    const nextWord = vocabularyService.getNextWord();
    
    if (nextWord) {
      setCurrentWord(nextWord);
      // Increased timeout to 15 seconds to give more time for speech to complete
      timerRef.current = window.setTimeout(displayNextWord, 15000);
    } else {
      toast({
        title: "No vocabulary data",
        description: "Please upload an Excel file with vocabulary data.",
      });
    }
  }, [isPaused, clearTimer, toast]);

  // This effect checks for existing data and sets up initial state
  useEffect(() => {
    console.log("Checking for existing data");
    const hasExistingData = vocabularyService.hasData();
    console.log("Has existing data:", hasExistingData);
    setHasData(hasExistingData);
    
    if (hasExistingData) {
      const word = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      console.log("Initial word:", word);
      setCurrentWord(word);
      
      if (!isPaused) {
        clearTimer();
        // Increased initial timeout to 3 seconds to give more time before starting
        timerRef.current = window.setTimeout(displayNextWord, 3000);
      }
    }
    
    return () => {
      clearTimer();
      window.speechSynthesis.cancel();
    };
  }, [displayNextWord, isPaused, clearTimer]);

  const handleFileUploaded = () => {
    console.log("File uploaded callback triggered");
    setHasData(true);
    
    // Force a refresh of the current word
    const word = vocabularyService.getNextWord();
    console.log("New word after file upload:", word);
    setCurrentWord(word);
    
    if (!isPaused) {
      clearTimer();
      // Increased timeout after file upload to 2 seconds
      timerRef.current = window.setTimeout(displayNextWord, 2000);
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
    // Only proceed if not currently speaking
    if (!isSpeakingRef.current) {
      clearTimer();
      displayNextWord();
    } else {
      console.log("Currently speaking, please wait...");
      // Optional: Could show a toast here
    }
  };

  return {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    setHasData,
    isSpeakingRef
  };
};
