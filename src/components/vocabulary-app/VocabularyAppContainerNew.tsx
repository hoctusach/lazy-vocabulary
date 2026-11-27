
import React, { useMemo } from "react";
import VocabularyLayout from "@/components/VocabularyLayout";
import ErrorDisplay from "./ErrorDisplay";
import ContentWithDataNew from "./ContentWithDataNew";
import VocabularyCardNew from "./VocabularyCardNew";
import LoadingCard from "./LoadingCard";
import UserInteractionManager from "./UserInteractionManager";
import AudioStatusIndicator from "./AudioStatusIndicator";
import { useStableVocabularyState } from "@/hooks/vocabulary-app/useStableVocabularyState";
import { useOptimizedAutoPlay } from "@/hooks/vocabulary-app/useOptimizedAutoPlay";
import { usePlaybackService } from '@/hooks/usePlaybackService';
import { vocabularyService } from '@/services/vocabularyService';
import { getFavoriteVoice } from '@/lib/preferences/localPreferences';
import { buildNativeQueue, findQueueIndex } from '@/services/background/buildNativeQueue';
import { getSpeechRate } from '@/utils/speech/core/speechSettings';
import { DebugInfoContext } from '@/contexts/DebugInfoContext';
import type { DailySelection } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';

interface VocabularyAppContainerNewProps {
  onMarkWordLearned?: (word: string, category?: string, sourceId?: string) => void;
  initialWords?: VocabularyWord[];
  additionalContent?: React.ReactNode;
  underPlayerContent?: React.ReactNode;
  onOpenSearch: (word?: string) => void;
  dailySelection?: DailySelection | null;
  isLoadingSelection?: boolean;
  currentUserLearnedCount?: number;
  currentUserLearningCount?: number;
  currentUserDueCount?: number;
  variant?: 'full' | 'card';
}

const VocabularyAppContainerNew: React.FC<VocabularyAppContainerNewProps> = ({
  onMarkWordLearned,
  initialWords,
  additionalContent,
  underPlayerContent,
  onOpenSearch,
  dailySelection,
  isLoadingSelection = false,
  currentUserLearnedCount,
  currentUserLearningCount,
  currentUserDueCount,
  variant = 'full',
}) => {
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
  } = useStableVocabularyState(initialWords, dailySelection);

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

  // [FB-52] The native service owns the upcoming queue. Built once per list/voice/mute change (current word read from a
  // ref); the index of the card inside it travels with every word update, so no re-push per word.
  const currentWordRef = React.useRef(currentWord);
  currentWordRef.current = currentWord;
  const nativeQueue = useMemo(
    () =>
      hasData
        ? buildNativeQueue(vocabularyService.getWordList(), currentWordRef.current, {
            voiceName: selectedVoiceName || getFavoriteVoice(), // [FB-61] never an empty voice before the list loads
            rate: getSpeechRate(),
            muted: isMuted,
          })
        : null,
    [hasData, selectedVoiceName, isMuted, initialWords, dailySelection]
  );
  const nativeIndex = nativeQueue && currentWord ? findQueueIndex(nativeQueue.items, currentWord) : undefined;

  // Android: keep playing (and show a notification) while the app is backgrounded.
  usePlaybackService({
    isPlaying: hasData && !isPaused && !!currentWord,
    active: hasData && !!currentWord,
    word: currentWord?.word,
    detail: currentWord?.meaning || currentWord?.category || currentCategory,
    // Explicit directions: a stale notification tap must never flip the wrong way.
    onPause: () => { if (!isPaused) togglePause(); },
    onPlay: () => { if (isPaused) togglePause(); },
    onNext: goToNextAndSpeak,
    queue: nativeQueue,
    index: nativeIndex,
    // Native advanced while the WebView was frozen: catch up (bounded) so the card matches what was last heard.
    onNativeSync: (target: number) => {
      if (nativeIndex === undefined || !nativeQueue) return;
      const n = nativeQueue.items.length;
      const steps = (((target - nativeIndex) % n) + n) % n;
      for (let i = 0; i < Math.min(steps, 8); i += 1) setTimeout(goToNextAndSpeak, 350 * (i + 1));
    },
  });

  // Memoize debug data
  const debugData = useMemo(() => {
    return currentWord
      ? { word: currentWord.word, category: currentWord.category || currentCategory }
      : null;
  }, [currentWord, currentCategory]);

  const debugInfo = useMemo(() => ({
    isMuted,
    selectedVoiceName,
    isPaused,
    currentWord: debugData
  }), [isMuted, selectedVoiceName, isPaused, debugData]);

  if (isLoadingSelection) {
    return (
      <DebugInfoContext.Provider value={debugInfo}>
        <VocabularyLayout showWordCard={true} hasData={false} onToggleView={() => {}}>
          <div className="space-y-3">
            <LoadingCard />
          </div>
        </VocabularyLayout>
      </DebugInfoContext.Provider>
    );
  }

  if (!hasData && !vocabularyService.hasData()) {
    return (
      <DebugInfoContext.Provider value={debugInfo}>
        <VocabularyLayout showWordCard={true} hasData={false} onToggleView={() => {}}>
          <div className="space-y-3">
            <UserInteractionManager
              currentWord={currentWord}
              playCurrentWord={playCurrentWord}
              onInteractionUpdate={handleInteractionUpdate}
            />
            <VocabularyCardNew
              word="No vocabulary data"
              meaning="Please upload a vocabulary file to get started"
              example=""
              backgroundColor="var(--lv-card-highlight)"
              isSpeaking={false}
              category="No Data"
            />
          </div>
        </VocabularyLayout>
      </DebugInfoContext.Provider>
    );
  }

  const emptyState = !hasData
    ? {
        word: `No words in "${currentCategory}" category`,
        meaning: "Try switching categories or regenerate today's list",
        example: '',
        category: currentCategory || 'No Data'
      }
    : undefined;

  if (!currentWord && hasData) {
    return (
      <DebugInfoContext.Provider value={debugInfo}>
        <VocabularyLayout showWordCard={true} hasData={true} onToggleView={() => {}}>
          <div className="space-y-3">
            <UserInteractionManager
              currentWord={currentWord}
              playCurrentWord={playCurrentWord}
              onInteractionUpdate={handleInteractionUpdate}
            />
            <VocabularyCardNew
              word="Loading vocabulary..."
              meaning="Please wait while we load your vocabulary data"
              example=""
              backgroundColor="var(--lv-card-highlight)"
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
        <div className="space-y-3">
          <UserInteractionManager
            currentWord={currentWord}
            playCurrentWord={playCurrentWord}
            onInteractionUpdate={handleInteractionUpdate}
          />
          <AudioStatusIndicator isAudioUnlocked={userInteractionState.isAudioUnlocked} />

          <ErrorDisplay jsonLoadError={false} />

          <ContentWithDataNew
            displayWord={currentWord}
            emptyState={emptyState}
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
            underPlayerContent={underPlayerContent}
            onOpenSearch={onOpenSearch}
            currentUserLearnedCount={currentUserLearnedCount}
            currentUserLearningCount={currentUserLearningCount}
            currentUserDueCount={currentUserDueCount}
            variant={variant}
          />
        </div>
      </VocabularyLayout>
    </DebugInfoContext.Provider>
  );
};

export default VocabularyAppContainerNew;
