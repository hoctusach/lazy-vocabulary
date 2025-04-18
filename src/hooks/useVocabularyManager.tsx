
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import { calculateSpeechDuration } from '@/utils/speechUtils';

export const useVocabularyManager = () => {
  const [hasData, setHasData] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isChangingWordRef = useRef<boolean>(false);
  const lastSpeechDurationRef = useRef<number>(0);
  const { toast } = useToast();
  const lastManualActionTimeRef = useRef<number>(Date.now());

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const displayNextWord = useCallback(async () => {
    // Check if there was a recent manual action (less than 1 second ago)
    const now = Date.now();
    const timeSinceLastManualAction = now - lastManualActionTimeRef.current;
    if (timeSinceLastManualAction < 1000) {
      console.log("Recent manual action detected, delaying auto word change");
      // Schedule this function to run again after the debounce period
      clearTimer();
      timerRef.current = window.setTimeout(displayNextWord, 1000);
      return;
    }
    
    // Don't process if already speaking or changing word
    if (isSpeakingRef.current || isChangingWordRef.current) {
      console.log("Speech is in progress or word is changing, delaying next word");
      // Retry after a delay instead of just returning
      clearTimer();
      timerRef.current = window.setTimeout(displayNextWord, 2000);
      return;
    }
    
    isChangingWordRef.current = true;
    clearTimer();
    window.speechSynthesis.cancel();
    
    if (isPaused) {
      isChangingWordRef.current = false;
      return;
    }
    
    const nextWord = vocabularyService.getNextWord();
    
    if (nextWord) {
      console.log("Displaying next word:", nextWord.word);
      setCurrentWord(nextWord);
      
      // Calculate total duration for word and add buffer time
      const fullText = `${nextWord.word}. ${nextWord.meaning}. ${nextWord.example}`;
      const duration = calculateSpeechDuration(fullText);
      lastSpeechDurationRef.current = duration;
      
      // Add buffer time for screen transitions - increased from 5000 to 8000ms for more reliable transitions
      const totalDuration = duration + 8000;
      
      // Release the changing word lock after a short timeout to allow UI to update
      setTimeout(() => {
        isChangingWordRef.current = false;
      }, 500);
      
      console.log(`Scheduled next word in ${totalDuration}ms`);
      clearTimer();
      timerRef.current = window.setTimeout(displayNextWord, totalDuration);
    } else {
      isChangingWordRef.current = false;
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
    lastManualActionTimeRef.current = Date.now();
    
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
    lastManualActionTimeRef.current = Date.now();
    
    setIsPaused(prev => {
      const newPauseState = !prev;
      window.speechSynthesis.cancel();
      
      if (!newPauseState) {
        // When unpausing, display next word after a short delay
        clearTimer();
        timerRef.current = window.setTimeout(displayNextWord, 1000);
      } else {
        clearTimer();
      }
      
      return newPauseState;
    });
  };

  const handleManualNext = () => {
    lastManualActionTimeRef.current = Date.now();
    
    // Only proceed if not currently speaking or changing word
    if (!isSpeakingRef.current && !isChangingWordRef.current) {
      clearTimer();
      displayNextWord();
    } else {
      console.log("Currently speaking or changing word, please wait...");
      toast({
        title: "Please wait",
        description: "Currently processing a word. Please wait until it completes.",
      });
    }
  };

  const handleSwitchCategory = (isMuted: boolean, voiceRegion: 'US' | 'UK') => {
    lastManualActionTimeRef.current = Date.now();
    
    if (!isSpeakingRef.current && !isChangingWordRef.current) {
      const nextCategory = vocabularyService.nextSheet();
      console.log(`Switched to category: ${nextCategory}`);
      
      // Clear any pending timers
      clearTimer();
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Get a new word from the new category immediately
      displayNextWord();
    } else {
      toast({
        title: "Please wait",
        description: "Currently processing a word. Please wait until it completes.",
      });
    }
  };

  return {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
    isSpeakingRef,
    isChangingWordRef,
    lastSpeechDurationRef
  };
};
