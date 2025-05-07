
import { useCallback, useRef, useEffect, useState } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { stopSpeaking } from '@/utils/speech';
import { useVocabularyData } from './useVocabularyData';
import { usePauseState } from './usePauseState';
import { useWordNavigation } from './useWordNavigation';
import { toast } from 'sonner';

export const useVocabularyManager = () => {
  const {
    hasData,
    setHasData,
    currentWord,
    setCurrentWord,
    handleFileUploaded: originalHandleFileUploaded,
    lastManualActionTimeRef,
    currentWordRef,
    initialLoadDoneRef
  } = useVocabularyData();

  const { isPaused, setIsPaused } = usePauseState();
  
  const [jsonLoadError, setJsonLoadError] = useState<boolean>(false);
  
  const isSpeakingRef = useRef<boolean>(false);
  const isChangingWordRef = useRef<boolean>(false);
  const wordChangeInProgressRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const { displayNextWord, timerRef } = useWordNavigation(
    isPaused,
    setCurrentWord,
    lastManualActionTimeRef,
    wordChangeInProgressRef,
    clearTimer
  );

  // Enhanced file upload handler with error handling - fixed to accept a File argument
  const handleFileUploaded = useCallback((file?: File) => {
    try {
      // Now we safely call originalHandleFileUploaded() without any arguments
      // and properly attach the catch handler to the returned Promise
      originalHandleFileUploaded()
        .catch(error => {
          console.error("Error processing vocabulary file:", error);
          setJsonLoadError(true);
          
          // Attempt to load default vocabulary instead
          try {
            vocabularyService.loadDefaultVocabulary();
            setHasData(true);
            
            const firstWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
            setCurrentWord(firstWord);
            
            toast.error("Custom vocabulary file is corrupt", {
              description: "Loaded default vocabulary list instead."
            });
          } catch (fallbackError) {
            console.error("Failed to load default vocabulary:", fallbackError);
          }
        });
    } catch (outerError) {
      console.error("Error in file upload handler:", outerError);
      setJsonLoadError(true);
      
      // Try loading default vocabulary
      vocabularyService.loadDefaultVocabulary();
      setHasData(true);
      
      const firstWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      setCurrentWord(firstWord);
      
      toast.error("Custom vocabulary file is corrupt", {
        description: "Loaded default vocabulary list instead."
      });
    }
  }, [originalHandleFileUploaded, setHasData, setCurrentWord]);

  const handleTogglePause = useCallback(() => {
    lastManualActionTimeRef.current = Date.now();
    stopSpeaking();
    
    setIsPaused(prev => {
      const newPauseState = !prev;
      console.log(`Pause state changed to: ${newPauseState}`);
      
      if (!newPauseState) {
        clearTimer();
        timerRef.current = window.setTimeout(displayNextWord, 800);
      } else {
        clearTimer();
      }
      
      return newPauseState;
    });
  }, [clearTimer, displayNextWord, setIsPaused]);

  const handleManualNext = useCallback(() => {
    if (wordChangeInProgressRef.current) {
      console.log("Word change already in progress, ignoring manual next request");
      return;
    }
    
    lastManualActionTimeRef.current = Date.now();
    clearTimer();
    stopSpeaking();
    
    wordChangeInProgressRef.current = true;
    isChangingWordRef.current = true;
    
    try {
      const nextWord = vocabularyService.getNextWord();
      if (nextWord) {
        setCurrentWord(nextWord);
      }
    } catch (error) {
      console.error("Error getting next word:", error);
      // Don't rethrow - gracefully continue
    } finally {
      setTimeout(() => {
        isChangingWordRef.current = false;
        wordChangeInProgressRef.current = false;
      }, 800);
    }
  }, [clearTimer, setCurrentWord]);

  const handleSwitchCategory = useCallback((isMuted: boolean, voiceRegion: 'US' | 'UK') => {
    if (wordChangeInProgressRef.current) {
      console.log("Word change in progress, ignoring category switch request");
      return;
    }
    
    lastManualActionTimeRef.current = Date.now();
    stopSpeaking();
    clearTimer();
    
    wordChangeInProgressRef.current = true;
    isChangingWordRef.current = true;
    
    try {
      const nextCategory = vocabularyService.nextSheet();
      console.log(`Switched to category: ${nextCategory}`);
      
      try {
        const storedStates = localStorage.getItem('buttonStates');
        const parsedStates = storedStates ? JSON.parse(storedStates) : {};
        parsedStates.currentCategory = nextCategory;
        localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
      } catch (error) {
        console.error('Error saving category to localStorage:', error);
        // Continue even if localStorage fails
      }
      
      const nextWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      if (nextWord) {
        setCurrentWord(nextWord);
      }
    } catch (error) {
      console.error("Error switching category:", error);
      // Don't rethrow - gracefully continue
    } finally {
      setTimeout(() => {
        isChangingWordRef.current = false;
        wordChangeInProgressRef.current = false;
      }, 1000);
    }
  }, [clearTimer, setCurrentWord]);

  useEffect(() => {
   // 1) Check if we already have data and set the flag
   try {
     const hasExistingData = vocabularyService.hasData();
     setHasData(hasExistingData);

     // 2) On first mount with data, just show the very first word
     if (hasExistingData && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      const firstWord =
        vocabularyService.getCurrentWord() ||
        vocabularyService.getNextWord();
      setCurrentWord(firstWord);
    }
   } catch (error) {
     console.error("Error checking vocabulary data:", error);
     // Try to load default vocabulary as a fallback
     try {
       vocabularyService.loadDefaultVocabulary();
       setHasData(true);
       setJsonLoadError(true);
       
       if (!initialLoadDoneRef.current) {
         initialLoadDoneRef.current = true;
         const firstWord = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
         setCurrentWord(firstWord);
         
         toast.error("Error loading vocabulary", {
           description: "Loaded default vocabulary list instead."
         });
       }
     } catch (fallbackError) {
       console.error("Failed to load default vocabulary:", fallbackError);
     }
   }

  // 3) Cleanup: clear any pending timer and stop speech
  return () => {
    clearTimer();
    stopSpeaking();
  };
}, [
  // We only care about 'isPaused' so we don't accidentally re-run
  // when pausing/unpausing—but you can even drop that if you like.
  isPaused,
  clearTimer,
  setHasData,
  setCurrentWord,
]);


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
    jsonLoadError
  };
};
