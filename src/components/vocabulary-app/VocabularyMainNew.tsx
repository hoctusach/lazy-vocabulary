import React from "react";
import { ReadonlyWord } from "@/types/vocabulary";
import VocabularyCardNew from "./VocabularyCardNew";
import { useBackgroundColor } from "./useBackgroundColor";
import VocabularyControlsColumn from "./VocabularyControlsColumn";
import PracticeDialog from "@/components/practice/PracticeDialog";

interface VocabularyMainNewProps {
  currentWord: ReadonlyWord | null;
  mute: boolean;
  isPaused: boolean;
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleCycleVoice: () => void;
  handleManualNext: () => void;
  isSoundPlaying: boolean;
  displayTime: number;
  selectedVoiceName: string;
  showWordCount?: boolean;
  playCurrentWord: () => void;
  onMarkWordLearned?: (word: string) => void;
  onOpenSearch: (word?: string) => void;
  emptyState?: {
    word: string;
    meaning: string;
    example?: string;
    translation?: string;
    category?: string;
  };
}

const VocabularyMainNew: React.FC<VocabularyMainNewProps> = ({
  currentWord,
  mute,
  isPaused,
  toggleMute,
  handleTogglePause,
  handleCycleVoice,
  handleManualNext,
  isSoundPlaying,
  displayTime,
  selectedVoiceName,
  showWordCount = false,
  playCurrentWord,
  onMarkWordLearned,
  onOpenSearch,
  emptyState,
}) => {
  const { backgroundColor } = useBackgroundColor();

  const wordToDisplay =
    currentWord?.word ?? emptyState?.word ?? "No vocabulary available";
  const meaningToDisplay = currentWord?.meaning ?? emptyState?.meaning ?? "";
  const exampleToDisplay = currentWord?.example ?? emptyState?.example ?? "";
  const translationToDisplay =
    currentWord?.translation ?? emptyState?.translation;
  const categoryToDisplay = currentWord?.category ?? emptyState?.category ?? "";
  const shouldShowWordCount = showWordCount && Boolean(currentWord);
  const [isPracticeOpen, setIsPracticeOpen] = React.useState(false);
  const wasPlayingBeforePracticeRef = React.useRef(false);

  const handleOpenPractice = React.useCallback(() => {
    wasPlayingBeforePracticeRef.current = !isPaused;
    if (!isPaused) {
      handleTogglePause();
    }
    unifiedSpeechController.stop();
    setIsPracticeOpen(true);
  }, [isPaused, handleTogglePause]);

  const handleClosePractice = React.useCallback(() => {
    setIsPracticeOpen(false);
    if (wasPlayingBeforePracticeRef.current && isPaused) {
      handleTogglePause();
    }
    wasPlayingBeforePracticeRef.current = false;
  }, [isPaused, handleTogglePause]);

  return (
    <div className="flex flex-row items-start gap-2 sm:gap-4 w-full max-w-5xl mx-auto">
      {/* Main card - takes most of the space */}
      <div className="flex-1 min-w-0">
        <VocabularyCardNew
          word={wordToDisplay}
          meaning={meaningToDisplay}
          example={exampleToDisplay}
          translation={translationToDisplay}
          backgroundColor={backgroundColor}
          isSpeaking={isSoundPlaying && Boolean(currentWord)}
          category={categoryToDisplay}
          showWordCount={shouldShowWordCount}
        />
      </div>

      {/* Controls column - positioned on the right side */}
      <div className="flex-none flex flex-col justify-start items-end">
        <VocabularyControlsColumn
          isMuted={mute}
          isPaused={isPaused}
          onToggleMute={toggleMute}
          onTogglePause={handleTogglePause}
          onNextWord={handleManualNext}
          onCycleVoice={handleCycleVoice}
          currentWord={currentWord}
          selectedVoiceName={selectedVoiceName}
          playCurrentWord={playCurrentWord}
          onMarkWordLearned={onMarkWordLearned}
          onOpenSearch={onOpenSearch}
          onOpenPractice={() => setIsPracticeOpen(true)}
        />
      </div>
      <PracticeDialog
        word={currentWord ? { ...currentWord } : null}
        isOpen={isPracticeOpen}
        onClose={() => setIsPracticeOpen(false)}
      />
    </div>
  );
};

export default VocabularyMainNew;
