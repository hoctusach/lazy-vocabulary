
import React from 'react';
import { useVocabularyContainerState } from '@/hooks/vocabulary/useVocabularyContainerState';
import { useSimpleVocabularyController } from '@/hooks/vocabulary-controller/useSimpleVocabularyController';
import { useVoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import VocabularyCard from '../VocabularyCard';
import FileUpload from '../FileUpload';
import { useCategoryNavigation } from '@/hooks/vocabulary/useCategoryNavigation';

const VocabularyContainer: React.FC = () => {
  console.log('[VOCAB-CONTAINER] === Component Render ===');
  
  // Get container state (word list, pause state, etc.)
  const containerState = useVocabularyContainerState();
  console.log('[VOCAB-CONTAINER] Container state:', {
    hasData: containerState.hasData,
    hasAnyData: containerState.hasAnyData,
    currentCategory: containerState.currentCategory
  });

  // Voice selection
  const { selectedVoice, cycleVoice } = useVoiceSelection();
  const nextVoiceLabel =
    selectedVoice.region === 'UK'
      ? 'US'
      : selectedVoice.region === 'US'
      ? 'AU'
      : 'US';

  // Get controller state (simplified version)
  const controllerState = useSimpleVocabularyController();
  
  console.log('[VOCAB-CONTAINER] Controller state:', {
    currentWord: controllerState.currentWord?.word || 'none',
    isPaused: controllerState.isPaused,
    isMuted: controllerState.isMuted,
    voiceRegion: controllerState.voiceRegion,
    isSpeaking: controllerState.isSpeaking
  });

  // Category navigation
  const { currentCategory, nextCategory } = useCategoryNavigation();

  // Cycle through available voices and update controller
  const handleCycleVoice = () => {
    cycleVoice();
    controllerState.toggleVoice();
  };

  // Optimized file upload handler that prevents excessive processing - now async
  const handleOptimizedFileUpload = async (file: File) => {
    console.log('[VOCAB-CONTAINER] Optimized file upload handler called');
    await containerState.handleFileUploaded(file);
  };

  // Optimized category switch handler
  const handleOptimizedCategorySwitch = () => {
    console.log('[VOCAB-CONTAINER] Optimized category switch handler called');
    // Stop current speech before switching
    if (controllerState.isSpeaking) {
      console.log('[VOCAB-CONTAINER] Stopping speech before category switch');
    }
    containerState.handleSwitchCategory();
  };

  // Show file upload if no data at all
  if (!containerState.hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">No Vocabulary Data</h2>
          <p className="text-gray-600 max-w-md">
            Upload an Excel file with your vocabulary words to get started.
          </p>
        </div>
        <FileUpload onFileUploaded={handleOptimizedFileUpload} />
      </div>
    );
  }

  // Show message if category has no words
  if (!containerState.hasData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-600">No data for this category</p>
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
        isMuted={controllerState.isMuted}
        isPaused={controllerState.isPaused}
        isSpeaking={controllerState.isSpeaking}
        onToggleMute={controllerState.toggleMute}
        onTogglePause={controllerState.togglePause}
        onCycleVoice={handleCycleVoice}
        onSwitchCategory={handleOptimizedCategorySwitch}
        onNextWord={controllerState.goToNext}
        currentCategory={currentCategory}
        nextCategory={nextCategory}
        selectedVoice={selectedVoice}
        nextVoiceLabel={nextVoiceLabel}
        category={controllerState.currentWord.category}
      />
    </div>
  );
};

export default VocabularyContainer;
