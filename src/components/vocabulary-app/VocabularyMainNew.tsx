import { stopSpeechForUserIntent } from '@/services/speech/stopSpeechForUserIntent';
import React from "react";
import { ReadonlyWord } from "@/types/vocabulary";
import VocabularyCardNew from "./VocabularyCardNew";
import { useBackgroundColor } from "./useBackgroundColor";
import VocabularyControlsColumn from "./VocabularyControlsColumn";
import PracticeDialog from "@/components/practice/PracticeDialog";
import { unifiedSpeechController } from "@/services/speech/unifiedSpeechController";
import { onTranslationEdit, SAVED_CONFIRM_MS } from "@/lib/translations/translationEditSignal";

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
  onMarkWordLearned?: (word: string, category?: string, sourceId?: string) => void;
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
    stopSpeechForUserIntent('practice');
    setIsPracticeOpen(true);
  }, [isPaused, handleTogglePause]);

  const handleClosePractice = React.useCallback(() => {
    setIsPracticeOpen(false);
    if (wasPlayingBeforePracticeRef.current && isPaused) {
      handleTogglePause();
    }
    wasPlayingBeforePracticeRef.current = false;
  }, [isPaused, handleTogglePause]);

  // Translation edit (FB-33): pause while editing; cancel restores the previous state on the same word;
  // save -> "Saved" confirmation, then next word and resume auto-play.
  const pausedRef = React.useRef(isPaused);
  pausedRef.current = isPaused;
  const toggleRef = React.useRef(handleTogglePause);
  toggleRef.current = handleTogglePause;
  const nextRef = React.useRef(handleManualNext);
  nextRef.current = handleManualNext;
  const pausedByEditRef = React.useRef(false);
  const advanceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    const clearTimer = () => { if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; } };
    const off = onTranslationEdit((e) => {
      if (e === 'start') {
        clearTimer();
        if (!pausedRef.current) {
          pausedByEditRef.current = true;
          toggleRef.current();
        }
        stopSpeechForUserIntent('translation-edit');
      } else if (e === 'cancel') {
        clearTimer();
        if (pausedByEditRef.current) {
          pausedByEditRef.current = false;
          if (pausedRef.current) toggleRef.current();
        }
      } else if (e === 'save') {
        clearTimer();
        const resume = pausedByEditRef.current;
        pausedByEditRef.current = false;
        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          // Un-pause first only if the edit paused it, then advance (goToNextAndSpeak speaks when not paused).
          if (resume && pausedRef.current) toggleRef.current();
          setTimeout(() => nextRef.current(), 0);
        }, SAVED_CONFIRM_MS);
      }
    });
    return () => { off(); clearTimer(); };
  }, []);

  return (
    <div data-lv-main-card className="flex w-full max-w-5xl flex-col gap-3 md:flex-row md:items-start md:gap-4 mx-auto">
      {/* Main card - takes most of the space. Controls sit under it on phones. */}
      <div className="min-w-0 flex-1">
        <VocabularyCardNew
          word={wordToDisplay}
          meaning={meaningToDisplay}
          example={exampleToDisplay}
          translation={translationToDisplay}
          backgroundColor={backgroundColor}
          isSpeaking={isSoundPlaying && Boolean(currentWord)}
          category={categoryToDisplay}
          sourceId={currentWord?.sourceId}
          showWordCount={shouldShowWordCount}
        />
      </div>

      <div className="w-full md:w-auto md:flex-none">
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
        />
      </div>
      <PracticeDialog
        word={currentWord ? { ...currentWord } : null}
        isOpen={isPracticeOpen}
        onClose={handleClosePractice}
      />
    </div>
  );
};

export default VocabularyMainNew;
