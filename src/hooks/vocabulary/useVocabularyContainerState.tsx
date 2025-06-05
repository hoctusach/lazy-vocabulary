
import { useVocabularyManager } from "@/hooks/vocabulary/useVocabularyManager";
import { useVocabularyAudioSync } from "@/hooks/useVocabularyAudioSync";
import { useModalState } from "./useModalState";
import { useCategoryNavigation } from "./useCategoryNavigation";
import { useSpeechControl } from "./useSpeechControl";
import { useState, useEffect } from "react";
import { vocabularyService } from "@/services/vocabularyService";

export const useVocabularyContainerState = () => {
  console.log('[VOCAB-CONTAINER-STATE] === Hook Initialization ===');
  
  // State for the current vocabulary list
  const [wordList, setWordList] = useState(vocabularyService.getWordList() || []);
  
  console.log('[VOCAB-CONTAINER-STATE] Initial word list:', {
    length: wordList?.length || 0,
    firstWord: wordList?.[0]?.word,
    sample: wordList?.slice(0, 3).map(w => w.word)
  });
  
  // Update word list when vocabulary changes
  useEffect(() => {
    const handleVocabularyChange = () => {
      console.log('[VOCAB-CONTAINER-STATE] Vocabulary change detected');
      const newWordList = vocabularyService.getWordList() || [];
      console.log('[VOCAB-CONTAINER-STATE] New word list:', {
        length: newWordList.length,
        firstWord: newWordList[0]?.word,
        sample: newWordList.slice(0, 3).map(w => w.word)
      });
      setWordList(newWordList);
    };
    
    // Set up the listener
    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);
    
    // Clean up
    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
    };
  }, []);
  
  // Get modal state
  const { isAddWordModalOpen, setIsAddWordModalOpen } = useModalState();

  // Vocabulary manager for handling word navigation
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
    setHasData,
    jsonLoadError
  } = useVocabularyManager();

  console.log('[VOCAB-CONTAINER-STATE] Vocabulary manager state:', {
    hasData,
    currentWord: currentWord?.word,
    isPaused
  });

  // Audio sync management
  const {
    isSoundPlaying,
    setIsSoundPlaying,
    displayTime,
    setDisplayTime
  } = useVocabularyAudioSync(currentWord, isPaused, false, "US");

  // Get category information
  const { currentCategory, nextCategory } = useCategoryNavigation();

  console.log('[VOCAB-CONTAINER-STATE] Final state summary:', {
    hasData,
    currentWord: currentWord?.word,
    wordListLength: wordList?.length || 0,
    currentCategory,
    isPaused,
    isSoundPlaying
  });

  // Combine all state and handlers
  return {
    // Modal state
    isAddWordModalOpen,
    setIsAddWordModalOpen,
    
    // Vocabulary state
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    jsonLoadError,
    
    // Category info
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    
    // Audio playback state
    isSoundPlaying,
    displayTime,
    
    // Word list for playback system
    wordList,
    
    // Debug data
    debugPanelData: currentWord ? {
      word: currentWord.word,
      category: currentWord.category || currentCategory
    } : null
  };
};
