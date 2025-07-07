import React from 'react';
import { useVocabularyContainerState } from '@/hooks/vocabulary/useVocabularyContainerState';
import { useUnifiedVocabularyController } from '@/hooks/vocabulary-controller/useUnifiedVocabularyController';
import VocabularyCard from '../VocabularyCard';
import FileUpload from '../FileUpload';
import { useCategoryNavigation } from '@/hooks/vocabulary/useCategoryNavigation';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';

const VocabularyContainer: React.FC = () => {
  console.log('[VOCAB-CONTAINER] === Component Render ===');
  
  // Get container state (word list, pause state, etc.)
  const containerState = useVocabularyContainerState();
  console.log('[VOCAB-CONTAINER] Container state:', {
    hasData: containerState.hasData,
    hasAnyData: containerState.hasAnyData,
    currentCategory: containerState.currentCategory
  });

  // Use ONLY unified controller - no more dual controller architecture
  const controllerState = useUnifiedVocabularyController();
  
  console.log('[VOCAB-CONTAINER] Unified controller state:', {
    currentWord: controllerState.currentWord?.word || 'none',
    isPaused: controllerState.isPaused,
    isMuted: controllerState.isMuted,
    voiceRegion: controllerState.voiceRegion,
    isSpeaking: controllerState.isSpeaking,
    hasData: controllerState.hasData
  });

  // Create proper VoiceSelection object based on current voice region
  const createVoiceSelection = (region: 'US' | 'UK' | 'AU'): VoiceSelection => {
    const voiceMap = {
      'US': { label: 'US', region: 'US' as const, gender: 'female' as const, index: 0 },
      'UK': { label: 'UK', region: 'UK' as const, gender: 'female' as const, index: 1 },
      'AU': { label: 'AU', region: 'AU' as const, gender: 'female' as const, index: 2 }
    };
    return voiceMap[region];
  };

  const selectedVoice = createVoiceSelection(controllerState.voiceRegion);

  const nextVoiceLabel =
    controllerState.voiceRegion === 'UK'
      ? 'US'
      : controllerState.voiceRegion === 'US'
      ? 'AU'
      : 'UK';

  // Category navigation
  const { currentCategory, nextCategory } = useCategoryNavigation();

  // Optimized file upload handler
  const handleOptimizedFileUpload = async (file: File) => {
    console.log('[VOCAB-CONTAINER] Optimized file upload handler called');
    await containerState.handleFileUploaded(file);
  };

  // Show file upload if no data at all
  if (!containerState.hasAnyData && !controllerState.hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold text-gray-800">No Vocabulary Data</h3>
          <p className="text-gray-600 max-w-md">
            Upload an Excel file with your vocabulary words to get started.
          </p>
        </div>
        <FileUpload onFileUploaded={handleOptimizedFileUpload} />
      </div>
    );
  }

  // Show message if category has no words
  if (!containerState.hasData && !controllerState.hasData) {
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
        onCycleVoice={controllerState.toggleVoice}
        onSwitchCategory={controllerState.switchCategory}
        onNextWord={controllerState.goToNextAndSpeak}
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
