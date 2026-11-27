
import React from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, SkipForward, Search, CheckCircle } from 'lucide-react';
import { showCongratsEffect } from '@/lib/utils/congratsEffect';
import AudioSheet from './AudioSheet';
import { toast } from 'sonner';
import { CONTROL_TOAST } from './controlToast';
import { ReadonlyWord } from '@/types/vocabulary';
import { cn } from '@/lib/utils';
import { MarkAsLearnedDialog } from '@/components/MarkAsLearnedDialog';
import { trackUiInteraction } from '@/services/analyticsService';

interface VocabularyControlsColumnProps {
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onNextWord: () => void;
  onCycleVoice: () => void;
  currentWord: ReadonlyWord | null;
  selectedVoiceName: string;
  playCurrentWord: () => void;
  onMarkWordLearned?: (word: string, category?: string, sourceId?: string) => void;
  onOpenSearch: (word?: string) => void;
}

const VocabularyControlsColumn: React.FC<VocabularyControlsColumnProps> = ({
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onNextWord,
  onCycleVoice,
  currentWord,
  selectedVoiceName,
  playCurrentWord,
  onMarkWordLearned,
  onOpenSearch
}) => {
  const handleTogglePause = () => {
    onTogglePause();
    trackUiInteraction(isPaused ? 'play' : 'pause', {
      label: isPaused ? 'Play' : 'Pause',
    });
    toast(isPaused ? 'Playback resumed' : 'Playback paused', CONTROL_TOAST);
  };

  const handleNextWord = () => {
    if (!currentWord) {
      toast.info('No words available in this category. Try switching categories or regenerate today\'s list.');
      return;
    }
    onNextWord();
    trackUiInteraction('next_word', { label: 'Next Word' });
  };

  const [isMarkAsLearnedDialogOpen, setIsMarkAsLearnedDialogOpen] = React.useState(false);
  const [wordToMark, setWordToMark] = React.useState<{ word: string; category?: string; sourceId?: string } | null>(null);

  const handleMarkAsLearnedClick = () => {
    setWordToMark(
      currentWord
        ? { word: currentWord.word, category: currentWord.category, sourceId: currentWord.sourceId }
        : null
    );
    trackUiInteraction('mark_as_learned_dialog_opened', {
      label: currentWord?.word || '',
    });
    setIsMarkAsLearnedDialogOpen(true);
  };
  const handleMarkAsLearnedConfirm = () => {
    if (wordToMark?.word) {
      trackUiInteraction('mark_as_learned_confirm', { label: wordToMark.word });
    }
    if (wordToMark?.word) showCongratsEffect(); // [FB-47] immediately, inside the tap (audio gesture), for every word set
    if (onMarkWordLearned && wordToMark?.word) {
      if (wordToMark.sourceId) onMarkWordLearned(wordToMark.word, wordToMark.category, wordToMark.sourceId);
      else onMarkWordLearned(wordToMark.word, wordToMark.category);
    }
    setIsMarkAsLearnedDialogOpen(false);
    toast('Word marked as learned.', CONTROL_TOAST);
  };

  const controlClass =
    'lv-ctl h-11 min-h-11 w-full flex-col gap-1 px-1 py-1 text-[11px] leading-none md:h-11 md:w-11 md:flex-row md:px-0';

  return (
    <div className="lv-controls grid w-full grid-cols-4 gap-2 md:flex md:w-auto md:flex-col md:items-end">
      <AudioSheet
        isMuted={isMuted}
        isPaused={isPaused}
        onToggleMute={onToggleMute}
        selectedVoiceName={selectedVoiceName}
        playCurrentWord={playCurrentWord}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={handleTogglePause}
        className={cn(
          controlClass,
          'lv-ctl-pause border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)]',
          isPaused
            ? 'text-orange-700 border-orange-300 bg-orange-50 dark:text-orange-200 dark:border-orange-700 dark:bg-orange-900/40'
            : ''
        )}
        title={isPaused ? 'Play' : 'Pause'}
        aria-label={isPaused ? 'Play' : 'Pause'}
      >
        {isPaused ? <Play size={18} /> : <Pause size={18} />}
        <span className="md:sr-only">{isPaused ? 'Play' : 'Pause'}</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNextWord}
        className={cn(controlClass, 'lv-ctl-next border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)] dark:hover:bg-slate-900')}
        title="Next Word"
        aria-label="Next Word"
      >
        <SkipForward size={18} />
        <span className="md:sr-only">Next</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          trackUiInteraction('search_modal_opened', {
            label: currentWord?.word || '',
          });
          onOpenSearch();
        }}
        className={cn(controlClass, 'lv-ctl-search border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)] dark:hover:bg-slate-900')}
        title="Quick Search"
        aria-label="Quick Search"
      >
        <Search size={18} />
        <span className="md:sr-only">Search</span>
      </Button>



      {onMarkWordLearned && (
        <Button
          size="sm"
          onClick={handleMarkAsLearnedClick}
          variant="outline"
          className="lv-ctl-mark col-span-4 h-11 min-h-11 w-full gap-1.5 px-2 text-xs font-semibold text-[var(--lv-text-primary)] disabled:opacity-60 md:w-auto md:min-w-11"
          title="Mark as Learned"
          aria-label="Mark as Learned"
          disabled={!currentWord}
        >
          <CheckCircle size={16} aria-hidden="true" />
          <span className="md:sr-only">Mark as Learned</span>
        </Button>
      )}

      <MarkAsLearnedDialog
        isOpen={isMarkAsLearnedDialogOpen}
        onClose={() => setIsMarkAsLearnedDialogOpen(false)}
        onConfirm={handleMarkAsLearnedConfirm}
        word={wordToMark?.word ?? ''}
      />
    </div>
  );
};

export default VocabularyControlsColumn;
