
import React, { useMemo } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import ErrorDisplay from "./ErrorDisplay";
import ContentWithDataNew from "./ContentWithDataNew";
import VocabularyCardNew from "./VocabularyCardNew";
import UserInteractionManager from "./UserInteractionManager";
import { useStableVocabularyState } from "@/hooks/vocabulary-app/useStableVocabularyState";
import { useOptimizedAutoPlay } from "@/hooks/vocabulary-app/useOptimizedAutoPlay";
import { vocabularyService } from '@/services/vocabularyService';
import { DebugInfoContext } from '@/contexts/DebugInfoContext';
import { VocabularyWord } from '@/types/vocabulary';

interface VocabularyAppContainerNewProps {
  onMarkWordLearned?: (word: string) => void;
  initialWords?: VocabularyWord[];
  additionalContent?: React.ReactNode;
  onOpenSearch: (word?: string) => void;
}

const VocabularyAppContainerNew: React.FC<VocabularyAppContainerNewProps> = ({ onMarkWordLearned, initialWords, additionalContent, onOpenSearch }) => {
  // Use stable state management
  const {
    currentWord,
    hasData,
    currentCategory,
    isPaused,
    isMuted,
    selectedVoiceName,
    allVoices,
    isSpeaking,
    goToNextAndSpeak,
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord,
    userInteractionState,
    handleInteractionUpdate
  } = useStableVocabularyState(initialWords);

  // Optimized auto-play with reduced re-renders
  useOptimizedAutoPlay({
    hasData,
    currentWord,
    hasInitialized: userInteractionState.hasInitialized,
    isPaused,
    isMuted,
    isSpeaking,
    isAudioUnlocked: userInteractionState.isAudioUnlocked,
    playCurrentWord
  });

  // Memoize debug data
  const debugData = useMemo(() => {
    return currentWord
      ? { word: currentWord.word, category: currentWord.category || currentCategory }
      : null;
  }, [currentWord?.word, currentWord?.category, currentCategory]);

  const debugInfo = useMemo(() => ({
    isMuted,
    selectedVoiceName,
    isPaused,
    currentWord: debugData
  }), [isMuted, selectedVoiceName, isPaused, debugData]);

  if (!hasData && !vocabularyService.hasData()) {
    return (
      <DebugInfoContext.Provider value={debugInfo}>
        <VocabularyLayout showWordCard={true} hasData={false} onToggleView={() => {}}>
          <div className="space-y-4">
            <UserInteractionManager
              currentWord={currentWord}
              playCurrentWord={playCurrentWord}
              onInteractionUpdate={handleInteractionUpdate}
            />
            <VocabularyCardNew
              word="No vocabulary data"
              meaning="Please upload a vocabulary file to get started"
              example=""
              backgroundColor="#F0F8FF"
              isSpeaking={false}
              category="No Data"
            />
          </div>
        </VocabularyLayout>
      </DebugInfoContext.Provider>
    );
  }

  if (!hasData) {
    return (
      <DebugInfoContext.Provider value={debugInfo}>
        <VocabularyLayout showWordCard={true} hasData={false} onToggleView={() => {}}>
          <div className="space-y-4">
            <UserInteractionManager
              currentWord={currentWord}
              playCurrentWord={playCurrentWord}
              onInteractionUpdate={handleInteractionUpdate}
            />
            <VocabularyCardNew
              word={`No words in "${currentCategory}" category`}
              meaning="Try switching to another category"
              example=""
              backgroundColor="#F0F8FF"
              isSpeaking={false}
              category={currentCategory}
            />
          </div>
        </VocabularyLayout>
      </DebugInfoContext.Provider>
    );
  }

  if (!currentWord) {
    return (
      <DebugInfoContext.Provider value={debugInfo}>
        <VocabularyLayout showWordCard={true} hasData={true} onToggleView={() => {}}>
          <div className="space-y-4">
            <UserInteractionManager
              currentWord={currentWord}
              playCurrentWord={playCurrentWord}
              onInteractionUpdate={handleInteractionUpdate}
            />
            <VocabularyCardNew
              word="Loading vocabulary..."
              meaning="Please wait while we load your vocabulary data"
              example=""
              backgroundColor="#F0F8FF"
              isSpeaking={false}
              category="Loading"
            />
          </div>
        </VocabularyLayout>
      </DebugInfoContext.Provider>
    );
  }

  return (
    <DebugInfoContext.Provider value={debugInfo}>
      <VocabularyLayout showWordCard={true} hasData={hasData} onToggleView={() => {}}>
        <div className="space-y-4">
          <UserInteractionManager
            currentWord={currentWord}
            playCurrentWord={playCurrentWord}
            onInteractionUpdate={handleInteractionUpdate}
          />

          <ErrorDisplay jsonLoadError={false} />

          <ContentWithDataNew
            displayWord={currentWord}
            muted={isMuted}
            paused={isPaused}
            toggleMute={toggleMute}
            handleTogglePause={togglePause}
            handleCycleVoice={toggleVoice}
            isSpeaking={isSpeaking}
            handleManualNext={goToNextAndSpeak}
            displayTime={5000}
            selectedVoiceName={selectedVoiceName}
            playCurrentWord={playCurrentWord}
            onMarkWordLearned={onMarkWordLearned}
            additionalContent={additionalContent}
            onOpenSearch={onOpenSearch}
          />
        </div>
      </VocabularyLayout>
    </DebugInfoContext.Provider>
  );
};

export default VocabularyAppContainerNew;
