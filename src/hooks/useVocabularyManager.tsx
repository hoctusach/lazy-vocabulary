
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import { calculateSpeechDuration } from '@/utils/speechUtils';

export const useVocabularyManager = () => {
  // Try to get initial pause state from localStorage
  const initialPaused = localStorage.getItem('isPaused') === 'true';

  const [hasData, setHasData] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [isPaused, setIsPaused] = useState(initialPaused);
  const timerRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isChangingWordRef = useRef<boolean>(false);
  const lastSpeechDurationRef = useRef<number>(0);
  const { toast } = useToast();
  const lastManualActionTimeRef = useRef<number>(Date.now());

  // Save pause state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isPaused', isPaused.toString());
  }, [isPaused]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const displayNextWord = useCallback(async () => {
    // Don't process if paused
    if (isPaused) {
      console.log("App is paused, not displaying next word");
      return;
    }
    
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
    
    // Set changing word state to prevent conflicts
    isChangingWordRef.current = true;
    clearTimer();
    window.speechSynthesis.cancel();
    
    // Double-check pause state again
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
      
      // Add buffer time for screen transitions - increased to 8000ms for more reliable transitions
      const totalDuration = duration + 8000;
      
      // Release the changing word lock after a short timeout to allow UI to update
      setTimeout(() => {
        isChangingWordRef.current = false;
      }, 500);
      
      console.log(`Scheduled next word in ${totalDuration}ms`);
      clearTimer();
      
      // Only schedule next word if not paused
      if (!isPaused) {
        timerRef.current = window.setTimeout(displayNextWord, totalDuration);
      }
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
    console.log("Checking for existing data, isPaused:", isPaused);
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
      console.log(`Pause state changed to: ${newPauseState}`);
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
    clearTimer();
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Set changing word flag to prevent conflicts
    isChangingWordRef.current = true;
    
    // Get next word and update state
    const nextWord = vocabularyService.getNextWord();
    if (nextWord) {
      console.log("Manual next word:", nextWord.word);
      setCurrentWord(nextWord);
      
      // Calculate duration for scheduling next word if not paused
      const fullText = `${nextWord.word}. ${nextWord.meaning}. ${nextWord.example}`;
      const duration = calculateSpeechDuration(fullText);
      lastSpeechDurationRef.current = duration;
      
      // Schedule next word after this one if not paused
      if (!isPaused) {
        clearTimer();
        timerRef.current = window.setTimeout(displayNextWord, duration + 8000);
      }
    }
    
    // Release changing word lock after UI update
    setTimeout(() => {
      isChangingWordRef.current = false;
    }, 300);
  };

  const handleSwitchCategory = (isMuted: boolean, voiceRegion: 'US' | 'UK') => {
    lastManualActionTimeRef.current = Date.now();
    
    // Cancel any ongoing speech and timer
    window.speechSynthesis.cancel();
    clearTimer();
    
    // Set changing category flag
    isChangingWordRef.current = true;
    
    // Switch to next category
    const nextCategory = vocabularyService.nextSheet();
    console.log(`Switched to category: ${nextCategory}`);
    
    // Get first word from new category
    const nextWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
    if (nextWord) {
      console.log("First word in new category:", nextWord.word);
      setCurrentWord(nextWord);
      
      // Calculate duration for scheduling next word
      const fullText = `${nextWord.word}. ${nextWord.meaning}. ${nextWord.example}`;
      const duration = calculateSpeechDuration(fullText);
      lastSpeechDurationRef.current = duration;
      
      // Schedule next word if not paused
      if (!isPaused) {
        clearTimer();
        timerRef.current = window.setTimeout(displayNextWord, duration + 8000);
      }
    }
    
    // Release changing word lock after UI update
    setTimeout(() => {
      isChangingWordRef.current = false;
    }, 300);
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
