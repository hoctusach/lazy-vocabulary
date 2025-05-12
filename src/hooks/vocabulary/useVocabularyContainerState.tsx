
import { useVocabularyManager } from "@/hooks/vocabulary/useVocabularyManager";
import { useMuteToggle } from "@/hooks/useMuteToggle";
import { useVocabularyAudioSync } from "@/hooks/useVocabularyAudioSync";
import { useModalState } from "./useModalState";
import { useCategoryNavigation } from "./useCategoryNavigation";
import { useSpeechControl } from "./useSpeechControl";
import { useState, useEffect } from "react";
import { vocabularyService } from "@/services/vocabularyService";

export const useVocabularyContainerState = () => {
  // State for the current vocabulary list
  const [wordList, setWordList] = useState(vocabularyService.getWordList() || []);
  
  // Update word list when vocabulary changes
  useEffect(() => {
    const handleVocabularyChange = () => {
      setWordList(vocabularyService.getWordList() || []);
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

  // Audio sync management
  const {
    isSoundPlaying,
    setIsSoundPlaying,
    displayTime,
    setDisplayTime
  } = useVocabularyAudioSync(currentWord, isPaused, false, "US");

  // Get category information
  const { currentCategory, nextCategory } = useCategoryNavigation();

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
