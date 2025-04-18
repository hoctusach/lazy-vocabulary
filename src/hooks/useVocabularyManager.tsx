
import { useState, useCallback, useEffect, useRef } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import { calculateSpeechDuration, stopSpeaking } from '@/utils/speech';

export const useVocabularyManager = () => {
  // Try to get initial states from localStorage
  const getInitialStates = () => {
    try {
      const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        return {
          initialPaused: parsedStates.isPaused === true,
          initialCategory: parsedStates.currentCategory || null
        };
      }
    } catch (error) {
      console.error('Error reading button states from localStorage:', error);
    }
    return { initialPaused: false, initialCategory: null };
  };

  const { initialPaused, initialCategory } = getInitialStates();

  const [hasData, setHasData] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [isPaused, setIsPaused] = useState(initialPaused);
  const timerRef = useRef<number | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isChangingWordRef = useRef<boolean>(false);
  const lastSpeechDurationRef = useRef<number>(0);
  const lastManualActionTimeRef = useRef<number>(Date.now());
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const wordChangeInProgressRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  // Update isPaused in localStorage when it changes
  useEffect(() => {
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const parsedStates = storedStates ? JSON.parse(storedStates) : {};
      parsedStates.isPaused = isPaused;
      localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
    } catch (error) {
      console.error('Error saving pause state to localStorage:', error);
    }
  }, [isPaused]);

  // Keep currentWordRef updated
  useEffect(() => {
    currentWordRef.current = currentWord;
  }, [currentWord]);

  // Set initial category if available
  useEffect(() => {
    if (initialCategory && vocabularyService.hasData()) {
      try {
        vocabularyService.switchSheet(initialCategory);
      } catch (error) {
        console.error('Error setting initial category:', error);
      }
    }
  }, [initialCategory]);

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
    
    // Check if there was a recent manual action (less than 1.5 seconds ago)
    const now = Date.now();
    const timeSinceLastManualAction = now - lastManualActionTimeRef.current;
    if (timeSinceLastManualAction < 1500) {
      console.log("Recent manual action detected, delaying auto word change");
      // Schedule this function to run again after the debounce period
      clearTimer();
      timerRef.current = window.setTimeout(displayNextWord, 1500);
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
        
        // Reduced buffer time to 2 seconds as requested
        const totalDuration = duration + 2000;
        
        console.log(`Scheduled next word in ${totalDuration}ms`);
        clearTimer();
        
        // Only schedule next word if not paused
        if (!isPaused) {
          timerRef.current = window.setTimeout(displayNextWord, totalDuration);
        }
      } else {
        console.warn("No vocabulary data");
      }
    } finally {
      // Release the changing word lock after a short timeout to allow UI to update
      setTimeout(() => {
        isChangingWordRef.current = false;
        wordChangeInProgressRef.current = false;
      }, 800);
    }
  }, [isPaused, clearTimer]);

  // This effect checks for existing data and sets up initial state
  useEffect(() => {
    console.log("Checking for existing data, isPaused:", isPaused);
    const hasExistingData = vocabularyService.hasData();
    console.log("Has existing data:", hasExistingData);
    setHasData(hasExistingData);
    
    if (hasExistingData && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      const word = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      console.log("Initial word:", word);
      setCurrentWord(word);
      
      if (!isPaused) {
        clearTimer();
        // Start the first word immediately to ensure sync
        timerRef.current = window.setTimeout(displayNextWord, 500);
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
    initialLoadDoneRef.current = true;
    
    // Force a refresh of the current word
    const word = vocabularyService.getNextWord();
    console.log("New word after file upload:", word);
    setCurrentWord(word);
    
    if (!isPaused) {
      clearTimer();
      // Show the first word immediately after upload
      timerRef.current = window.setTimeout(displayNextWord, 500);
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
        timerRef.current = window.setTimeout(displayNextWord, 800);
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
      
      // Schedule next word after this one if not paused (use 2 second buffer)
      if (!isPaused) {
        clearTimer();
        timerRef.current = window.setTimeout(displayNextWord, duration + 2000);
      }
    }
    
    // Release changing word lock after UI update
    setTimeout(() => {
      isChangingWordRef.current = false;
      wordChangeInProgressRef.current = false;
    }, 800);
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
    
    // Save current category to localStorage
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const parsedStates = storedStates ? JSON.parse(storedStates) : {};
      parsedStates.currentCategory = nextCategory;
      localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
    } catch (error) {
      console.error('Error saving category to localStorage:', error);
    }
    
    // Get first word from new category
    const nextWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
    if (nextWord) {
      console.log("First word in new category:", nextWord.word);
      setCurrentWord(nextWord);
      
      // Calculate duration for scheduling next word (with 2 second buffer)
      const fullText = `${nextWord.word}. ${nextWord.meaning}. ${nextWord.example}`;
      const duration = calculateSpeechDuration(fullText);
      lastSpeechDurationRef.current = duration;
      
      // Schedule next word if not paused
      if (!isPaused) {
        clearTimer();
        timerRef.current = window.setTimeout(displayNextWord, duration + 2000);
      }
    }
    
    // Release changing word lock after UI update (shorter delay for category change)
    setTimeout(() => {
      isChangingWordRef.current = false;
      wordChangeInProgressRef.current = false;
    }, 1000);
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
