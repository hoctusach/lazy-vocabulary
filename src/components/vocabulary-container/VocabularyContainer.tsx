
import React from 'react';
import { useVocabularyContainerState } from './useVocabularyContainerState';
import { useVocabularyController } from '@/hooks/vocabulary-controller/useVocabularyController';
import { useVoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import VocabularyCard from '../VocabularyCard';
import { FileUpload } from '../FileUpload';
import { useCategoryNavigation } from '@/hooks/vocabulary/useCategoryNavigation';

const VocabularyContainer: React.FC = () => {
  console.log('[VOCAB-CONTAINER-NEW] === Component Render ===');
  
  // Get container state (word list, pause state, etc.)
  const containerState = useVocabularyContainerState();
  console.log('[VOCAB-CONTAINER-NEW] Container state:', {
    hasData: containerState.hasData,
    wordListLength: containerState.wordList.length,
    currentCategory: containerState.currentCategory
  });

  // Voice selection
  const { selectedVoice, cycleVoice } = useVoiceSelection();

  // Get controller state (synchronized with vocabulary service)
  const controllerState = useVocabularyController(
    containerState.wordList,
    selectedVoice,
    containerState.isPaused,
    containerState.isMuted
  );
  
  console.log('[VOCAB-CONTAINER-NEW] Controller state:', {
    currentWord: controllerState.currentWord?.word || 'none',
    currentIndex: controllerState.currentIndex,
    isPaused: containerState.isPaused,
    isMuted: containerState.isMuted,
    voiceRegion: selectedVoice.region,
    isSpeaking: controllerState.isSpeaking
  });

  // Category navigation
  const { currentCategory, nextCategory } = useCategoryNavigation();

  // Show file upload if no data
  if (!containerState.hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">No Vocabulary Data</h2>
          <p className="text-gray-600 max-w-md">
            Upload an Excel file with your vocabulary words to get started.
          </p>
        </div>
        <FileUpload onFileUploaded={containerState.handleFileUploaded} />
      </div>
    );
  }

  // Show loading if no current word
  if (!controllerState.currentWord) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <VocabularyCard
        word={controllerState.currentWord.word}
        meaning={controllerState.currentWord.meaning}
        example={controllerState.currentWord.example}
        backgroundColor="#F0F8FF"
        isMuted={containerState.isMuted}
        isPaused={containerState.isPaused}
        isSpeaking={controllerState.isSpeaking}
        onToggleMute={containerState.handleToggleMute}
        onTogglePause={containerState.handleTogglePause}
        onCycleVoice={cycleVoice}
        onSwitchCategory={containerState.handleSwitchCategory}
        onNextWord={controllerState.goToNext}
        currentCategory={currentCategory}
        nextCategory={nextCategory}
        selectedVoice={selectedVoice}
        category={controllerState.currentWord.category}
      />
    </div>
  );
};

export default VocabularyContainer;
