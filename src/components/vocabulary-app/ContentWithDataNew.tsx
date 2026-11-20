import React from "react";
import type { ReadonlyWord } from "@/types/vocabulary";
import VocabularyMainNew from "./VocabularyMainNew";
import LeaderboardPanel from "./LeaderboardPanel";
import StreakPanel from "./StreakPanel";

interface ContentWithDataNewProps {
  displayWord: ReadonlyWord | null;
  muted: boolean;
  paused: boolean;
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleCycleVoice: () => void;
  isSpeaking: boolean;
  handleManualNext: () => void;
  displayTime: number;
  selectedVoiceName: string;
  playCurrentWord: () => void;
  onMarkWordLearned?: (word: string, category?: string, sourceId?: string) => void;
  onOpenSearch: (word?: string) => void;
  currentUserLearnedCount?: number;
  currentUserLearningCount?: number;
  currentUserDueCount?: number;
  additionalContent?: React.ReactNode;
  variant?: 'full' | 'card';
  emptyState?: {
    word: string;
    meaning: string;
    example?: string;
    translation?: string;
    category?: string;
  };
}

const ContentWithDataNew: React.FC<ContentWithDataNewProps> = ({
  displayWord,
  muted,
  paused,
  toggleMute,
  handleTogglePause,
  handleCycleVoice,
  isSpeaking,
  handleManualNext,
  displayTime,
  selectedVoiceName,
  playCurrentWord,
  onMarkWordLearned,
  onOpenSearch,
  currentUserLearnedCount,
  currentUserLearningCount,
  currentUserDueCount,
  additionalContent,
  variant = 'full',
  emptyState,
}) => {
  const cardOnly = variant === 'card';
  return (
    <>
      {/* Main vocabulary display */}
      <VocabularyMainNew
        currentWord={displayWord}
        emptyState={emptyState}
        mute={muted}
        isPaused={paused}
        toggleMute={toggleMute}
        handleTogglePause={handleTogglePause}
        handleCycleVoice={handleCycleVoice}
        isSoundPlaying={isSpeaking}
        handleManualNext={handleManualNext}
        displayTime={displayTime}
        selectedVoiceName={selectedVoiceName}
        playCurrentWord={playCurrentWord}
        onMarkWordLearned={onMarkWordLearned}
        onOpenSearch={onOpenSearch}
      />

      {!cardOnly && <StreakPanel refreshKey={currentUserLearnedCount} />}

      {!cardOnly && (
        <LeaderboardPanel
          currentUserLearnedCount={currentUserLearnedCount}
          currentUserLearningCount={currentUserLearningCount}
          currentUserDueCount={currentUserDueCount}
        />
      )}

      {!cardOnly && additionalContent}
    </>
  );
};

export default ContentWithDataNew;
