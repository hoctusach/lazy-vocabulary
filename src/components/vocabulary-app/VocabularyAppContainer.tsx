
import React, { useState } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import WelcomeScreen from "@/components/WelcomeScreen";
import { toast } from "sonner";
import AddWordButton from "./AddWordButton";
import EditWordButton from "./EditWordButton";
import ExportButton from "./ExportButton";
import AddWordModal from "./AddWordModal";
import DebugPanel from "@/components/DebugPanel";
import ErrorDisplay from "./ErrorDisplay";
import VocabularyMain from "./VocabularyMain";
import { useVocabularyContainerState } from "@/hooks/vocabulary/useVocabularyContainerState";
import { vocabularyService } from "@/services/vocabularyService";
import { exportVocabularyAsTypeScript } from "@/utils/exportVocabulary";
import { VocabularyWord } from "@/types/vocabulary";

const VocabularyAppContainer: React.FC = () => {
  // Modal states
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Get all state and handlers from our custom hook
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    jsonLoadError,
    mute,
    voiceRegion,
    toggleMute,
    handleChangeVoice,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization,
    handleSwitchCategory,
    currentCategory,
    nextCategory,
    isSoundPlaying,
    displayTime,
    debugPanelData
  } = useVocabularyContainerState();

  // Handler for opening the add word modal
  const handleOpenAddWordModal = () => {
    setIsEditMode(false);
    setIsAddWordModalOpen(true);
  };
  
  // Handler for opening the edit word modal
  const handleOpenEditWordModal = () => {
    if (!currentWord) return;
    setIsEditMode(true);
    setIsAddWordModalOpen(true);
  };
  
  // Handler for closing the modal
  const handleCloseModal = () => {
    setIsAddWordModalOpen(false);
  };

  // Handler for saving a new word or updating an existing word
  const handleSaveWord = (wordData: { word: string; meaning: string; example: string; category: string }) => {
    if (isEditMode && currentWord) {
      // Get the original category for comparison
      const originalCategory = currentWord.category || currentCategory;
      
      // Create word entry to update/add
      const updatedWord: VocabularyWord = {
        word: wordData.word,
        meaning: wordData.meaning,
        example: wordData.example,
        category: wordData.category,
        count: currentWord.count || 0
      };
      
      // Determine if category changed
      const categoryChanged = originalCategory !== wordData.category;
      
      // Update in All words category
      updateWordInCategory("All words", updatedWord, currentWord.word);
      
      // Handle category-specific updates
      if (categoryChanged) {
        // Remove from old category
        removeWordFromCategory(originalCategory, currentWord.word);
        // Add to new category
        addWordToCategory(wordData.category, updatedWord);
      } else {
        // Update in same category
        updateWordInCategory(wordData.category, updatedWord, currentWord.word);
      }
      
      // Show appropriate toast message
      const toastMessage = categoryChanged 
        ? `"${wordData.word}" updated and moved to ${wordData.category}`
        : `"${wordData.word}" updated in ${wordData.category}`;
      
      toast.success(toastMessage, {
        description: `The word has been updated in All words and ${wordData.category}.`
      });
    } else {
      // Creating a new word entry
      const newWord: VocabularyWord = {
        word: wordData.word,
        meaning: wordData.meaning,
        example: wordData.example,
        category: wordData.category,
        count: 0
      };
      
      // Add to All words category
      addWordToCategory("All words", newWord);
      
      // Add to specific category
      addWordToCategory(wordData.category, newWord);
      
      // Show success notification
      toast.success(`"${wordData.word}" added to ${wordData.category}`, {
        description: `The word has been added to All words and ${wordData.category}.`
      });
    }
    
    // Close the modal
    handleCloseModal();
    
    // Refresh the vocabulary service to see the changes immediately
    vocabularyService.loadDefaultVocabulary();
  };

  // Helper function to add a word to a specific category
  const addWordToCategory = (category: string, word: VocabularyWord) => {
    try {
      // Get current words in the category
      let words = [];
      const storedWords = localStorage.getItem(category);
      if (storedWords) {
        words = JSON.parse(storedWords);
      }
      
      // Add the new word
      words.push(word);
      
      // Save back to localStorage
      localStorage.setItem(category, JSON.stringify(words));
    } catch (error) {
      console.error(`Failed to add word to category ${category}:`, error);
      toast.error(`Failed to add word to ${category}`);
    }
  };
  
  // Helper function to update a word in a specific category
  const updateWordInCategory = (category: string, updatedWord: VocabularyWord, oldWordText?: string) => {
    try {
      // Get current words in the category
      let words = [];
      const storedWords = localStorage.getItem(category);
      if (storedWords) {
        words = JSON.parse(storedWords);
      }
      
      // Find the word (if it exists)
      const wordToUpdate = oldWordText || updatedWord.word;
      const index = words.findIndex((w: VocabularyWord) => 
        w.word.toLowerCase() === wordToUpdate.toLowerCase());
      
      if (index >= 0) {
        // Update existing word
        words[index] = updatedWord;
      } else {
        // Word doesn't exist, add it
        words.push(updatedWord);
      }
      
      // Save back to localStorage
      localStorage.setItem(category, JSON.stringify(words));
    } catch (error) {
      console.error(`Failed to update word in category ${category}:`, error);
      toast.error(`Failed to update word in ${category}`);
    }
  };
  
  // Helper function to remove a word from a specific category
  const removeWordFromCategory = (category: string, wordToRemove: string) => {
    try {
      // Get current words in the category
      let words = [];
      const storedWords = localStorage.getItem(category);
      if (storedWords) {
        words = JSON.parse(storedWords);
      }
      
      // Filter out the word to remove
      words = words.filter((w: VocabularyWord) => 
        w.word.toLowerCase() !== wordToRemove.toLowerCase());
      
      // Save back to localStorage
      localStorage.setItem(category, JSON.stringify(words));
    } catch (error) {
      console.error(`Failed to remove word from category ${category}:`, error);
      toast.error(`Failed to remove word from ${category}`);
    }
  };

  // Handle speech retry
  const handleSpeechRetry = () => {
    retrySpeechInitialization();
  };

  // Ensure category is present when editing a word
  const getWordForEdit = () => {
    if (!currentWord) return undefined;
    
    // Make sure we have a category, using the current category as fallback
    return {
      word: currentWord.word,
      meaning: currentWord.meaning,
      example: currentWord.example,
      category: currentWord.category || currentCategory
    };
  };

  // Handler for exporting vocabulary data
  const handleExportData = () => {
    // Create an object to hold all vocabulary data
    const allData = {};
    
    // Get each sheet category
    vocabularyService.sheetOptions.forEach(sheetName => {
      // Get words from localStorage for this category
      try {
        const storedWords = localStorage.getItem(sheetName);
        if (storedWords) {
          const words = JSON.parse(storedWords);
          if (words.length > 0) {
            allData[sheetName] = words;
          }
        }
      } catch (error) {
        console.error(`Failed to get words for category ${sheetName}:`, error);
      }
    });
    
    // Export the data as a TypeScript file
    exportVocabularyAsTypeScript(allData);
    
    // Show a success notification
    toast.success("Export started", {
      description: "Your vocabulary data is being downloaded as a TypeScript file."
    });
  };

  return (
    <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
      {/* Error display component */}
      <ErrorDisplay jsonLoadError={jsonLoadError} />

      {hasData && currentWord ? (
        <>
          {/* Main vocabulary display */}
          <VocabularyMain
            currentWord={currentWord}
            mute={mute}
            isPaused={isPaused}
            voiceRegion={voiceRegion}
            toggleMute={toggleMute}
            handleTogglePause={handleTogglePause}
            handleChangeVoice={handleChangeVoice}
            handleSwitchCategory={() => handleSwitchCategory(mute, voiceRegion)}
            currentCategory={currentCategory}
            nextCategory={nextCategory}
            isSoundPlaying={isSoundPlaying}
            handleManualNext={handleManualNext}
            displayTime={displayTime}
            speechError={speechError}
            hasSpeechPermission={hasSpeechPermission}
            handleSpeechRetry={handleSpeechRetry}
          />
          
          {/* Action buttons container */}
          <div className="flex items-center justify-center gap-2 my-3">
            <EditWordButton 
              onClick={handleOpenEditWordModal} 
              disabled={!currentWord}
            />
            <AddWordButton onClick={handleOpenAddWordModal} />
            <ExportButton onClick={handleExportData} />
          </div>
          
          {/* Debug Panel */}
          <DebugPanel 
            isMuted={mute}
            voiceRegion={voiceRegion}
            isPaused={isPaused}
            currentWord={debugPanelData}
          />
          
          {/* Enhanced Word Modal (handles both add and edit) */}
          <AddWordModal 
            isOpen={isAddWordModalOpen} 
            onClose={handleCloseModal} 
            onSave={handleSaveWord}
            editMode={isEditMode}
            wordToEdit={isEditMode ? getWordForEdit() : undefined}
          />
        </>
      ) : (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      )}
    </VocabularyLayout>
  );
};

export default VocabularyAppContainer;
