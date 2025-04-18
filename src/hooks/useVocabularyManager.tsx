import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import { calculateSpeechDuration, stopSpeaking } from '@/utils/speech';

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
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const wordChangeInProgressRef = useRef(false);

  // Keep currentWordRef updated
  useEffect(() => {
    currentWordRef.current = currentWord;
  }, [currentWord]);

  // Save pause state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isPaused', isPaused.toString());
    console.log("Pause state saved to localStorage:", isPaused);
  }, [isPaused]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const displayNextWord = useCallback(async () => {
    // Prevent multiple word changes at once
    if (wordChangeInProgressRef.current) {
      console.log("Word change already in progress, ignoring request");
      return;
    }
    
    // Don't process if paused
    if (isPaused) {
      console.log("App is paused, not displaying next word");
      return;
    }
    
    // Check if there was a recent manual action (less than 2 seconds ago)
    const now = Date.now();
    const timeSinceLastManualAction = now - lastManualActionTimeRef.current;
    if (timeSinceLastManualAction < 2000) {
      console.log("Recent manual action detected, delaying auto word change");
      // Schedule this function to run again after the debounce period
      clearTimer();
      timerRef.current = window.setTimeout(displayNextWord, 2000);
      return;
    }
    
    // Set changing word state to prevent conflicts
    wordChangeInProgressRef.current = true;
    isChangingWordRef.current = true;
    clearTimer();
    stopSpeaking();
    
    // Double-check pause state again
    if (isPaused) {
      isChangingWordRef.current = false;
      wordChangeInProgressRef.current = false;
      return;
    }
    
    // Get next word and update UI
    try {
      const nextWord = vocabularyService.getNextWord();
      
      if (nextWord) {
        console.log("Displaying next word:", nextWord.word);
        setCurrentWord(nextWord);
        
        // Calculate total duration for word and add buffer time
        const fullText = `${nextWord.word}. ${nextWord.meaning}. ${nextWord.example}`;
        const duration = calculateSpeechDuration(fullText);
        lastSpeechDurationRef.current = duration;
        
        // Add buffer time for screen transitions - increased to 10000ms for more reliable transitions
        const totalDuration = duration + 10000;
        
        console.log(`Scheduled next word in ${totalDuration}ms`);
        clearTimer();
        
        // Only schedule next word if not paused
        if (!isPaused) {
          timerRef.current = window.setTimeout(displayNextWord, totalDuration);
        }
      } else {
        toast({
          title: "No vocabulary data",
          description: "Please upload an Excel file with vocabulary data.",
        });
      }
    } finally {
      // Release the changing word lock after a short timeout to allow UI to update
      setTimeout(() => {
        isChangingWordRef.current = false;
        wordChangeInProgressRef.current = false;
      }, 1000);
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
        // Increased initial timeout to 5 seconds to give more time before starting
        timerRef.current = window.setTimeout(displayNextWord, 5000);
      }
    }
    
    return () => {
      clearTimer();
      stopSpeaking();
    };
  }, [displayNextWord, isPaused, clearTimer]);

  const handleFileUploaded = useCallback(() => {
    console.log("File uploaded callback triggered");
    setHasData(true);
    lastManualActionTimeRef.current = Date.now();
    stopSpeaking();
    
    // Force a refresh of the current word
    const word = vocabularyService.getNextWord();
    console.log("New word after file upload:", word);
    setCurrentWord(word);
    
    if (!isPaused) {
      clearTimer();
      // Increased timeout after file upload to 3 seconds
      timerRef.current = window.setTimeout(displayNextWord, 3000);
    }
  }, [clearTimer, displayNextWord, isPaused]);

  const handleTogglePause = useCallback(() => {
    lastManualActionTimeRef.current = Date.now();
    stopSpeaking();
    
    setIsPaused(prev => {
      const newPauseState = !prev;
      console.log(`Pause state changed to: ${newPauseState}`);
      
      if (!newPauseState) {
        // When unpausing, display next word after a short delay
        clearTimer();
        timerRef.current = window.setTimeout(displayNextWord, 1500);
      } else {
        clearTimer();
      }
      
      return newPauseState;
    });
  }, [clearTimer, displayNextWord]);

  const handleManualNext = useCallback(() => {
    // Prevent multiple word changes at once
    if (wordChangeInProgressRef.current) {
      console.log("Word change already in progress, ignoring manual next request");
      return;
    }
    
    lastManualActionTimeRef.current = Date.now();
    clearTimer();
    
    // Cancel any ongoing speech
    stopSpeaking();
    
    // Set changing word flag to prevent conflicts
    wordChangeInProgressRef.current = true;
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
        timerRef.current = window.setTimeout(displayNextWord, duration + 10000);
      }
    }
    
    // Release changing word lock after UI update
    setTimeout(() => {
      isChangingWordRef.current = false;
      wordChangeInProgressRef.current = false;
    }, 1000);
  }, [clearTimer, displayNextWord, isPaused]);

  const handleSwitchCategory = useCallback((isMuted: boolean, voiceRegion: 'US' | 'UK') => {
    // Prevent multiple operations at once
    if (wordChangeInProgressRef.current) {
      console.log("Word change in progress, ignoring category switch request");
      return;
    }
    
    lastManualActionTimeRef.current = Date.now();
    
    // Cancel any ongoing speech and timer
    stopSpeaking();
    clearTimer();
    
    // Set changing category flag
    wordChangeInProgressRef.current = true;
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
        timerRef.current = window.setTimeout(displayNextWord, duration + 10000);
      }
    }
    
    // Release changing word lock after UI update (longer delay for category change)
    setTimeout(() => {
      isChangingWordRef.current = false;
      wordChangeInProgressRef.current = false;
    }, 1500);
  }, [clearTimer, displayNextWord, isPaused]);

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
