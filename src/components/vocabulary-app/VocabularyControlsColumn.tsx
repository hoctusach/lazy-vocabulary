
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  SkipForward,
  Speaker,
  Search,
  CheckCircle,
} from 'lucide-react';
import SpeechRateControl from './SpeechRateControl';
import { useSpeechRate } from '@/hooks/useSpeechRate';
import { toast } from 'sonner';
import { ReadonlyWord } from '@/types/vocabulary';
import { cn } from '@/lib/utils';
import { useVoiceContext } from '@/hooks/useVoiceContext';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
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
  onMarkWordLearned?: (word: string) => void;
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
  const { speechRate, setSpeechRate } = useSpeechRate();
  const { allVoices } = useVoiceContext();
  
  const handleToggleMute = () => {
    onToggleMute();
    trackUiInteraction(isMuted ? 'unmute' : 'mute', {
      label: isMuted ? 'Unmute' : 'Mute',
    });
    if (isMuted) {
      toast('Audio unmuted. Speech will resume from the next word.');
    } else {
      toast('Audio muted');
    }
  };

  const handleTogglePause = () => {
    onTogglePause();
    trackUiInteraction(isPaused ? 'play' : 'pause', {
      label: isPaused ? 'Play' : 'Pause',
    });
    toast(isPaused ? 'Playback resumed' : 'Playback paused');
  };

  const handleNextWord = () => {
    if (!currentWord) {
      toast.info('No words available in this category. Try switching categories or regenerate today\'s list.');
      return;
    }
    onNextWord();
    trackUiInteraction('next_word', { label: 'Next Word' });
  };

  const handleCycleVoice = () => {
    if (allVoices.length === 0) {
      toast.warning('No voices available');
      return;
    }
    onCycleVoice();
    trackUiInteraction('cycle_voice', { label: selectedVoiceName });
  };

  const handleRateChange = (r: number) => {
    setSpeechRate(r);
    trackUiInteraction('speech_rate_change', {
      label: `${r}x`,
      value: r,
    });
    unifiedSpeechController.stop();
    if (!isMuted && !isPaused) {
      playCurrentWord();
    }
  };

  const [isMarkAsLearnedDialogOpen, setIsMarkAsLearnedDialogOpen] = React.useState(false);
  const [wordToMark, setWordToMark] = React.useState('');

  const handleMarkAsLearnedClick = () => {
    setWordToMark(currentWord?.word || '');
    trackUiInteraction('mark_as_learned_dialog_opened', {
      label: currentWord?.word || '',
    });
    setIsMarkAsLearnedDialogOpen(true);
  };
  const handleMarkAsLearnedConfirm = () => {
    if (wordToMark) {
      trackUiInteraction('mark_as_learned_confirm', { label: wordToMark });
    }
    if (onMarkWordLearned && wordToMark) onMarkWordLearned(wordToMark);
    setIsMarkAsLearnedDialogOpen(false);
    toast('Word marked as learned.');
  };

  return (
    <div className="flex flex-col gap-2 items-end">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleMute}
        className={cn(
          'h-8 w-8 p-0 border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)]',
          isMuted
            ? 'text-purple-700 border-purple-300 bg-purple-50 dark:text-purple-100 dark:border-purple-700 dark:bg-purple-900/40'
            : ''
        )}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleTogglePause}
        className={cn(
          'h-8 w-8 p-0 border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)]',
          isPaused
            ? 'text-orange-500 border-orange-300 bg-orange-50 dark:text-orange-200 dark:border-orange-700 dark:bg-orange-900/40'
            : ''
        )}
        title={isPaused ? 'Play' : 'Pause'}
        aria-label={isPaused ? 'Play' : 'Pause'}
      >
        {isPaused ? <Play size={16} /> : <Pause size={16} />}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNextWord}
        className="h-8 w-8 p-0 border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)] dark:hover:bg-slate-900"
        title="Next Word"
        aria-label="Next Word"
      >
        <SkipForward size={16} />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCycleVoice}
        className={cn(
          'h-8 w-8 p-0 border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)] dark:hover:bg-slate-900',
          allVoices.length < 2 ? 'cursor-not-allowed opacity-50' : ''
        )}
        title={allVoices.length < 2 ? 'No other voices available' : 'Change Voice'}
        disabled={allVoices.length < 2}
        aria-label="Change Voice"
      >
        <Speaker size={16} />
      </Button>

      <SpeechRateControl rate={speechRate} onChange={handleRateChange} />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          trackUiInteraction('search_modal_opened', {
            label: currentWord?.word || '',
          });
          onOpenSearch();
        }}
        className="h-8 w-8 p-0 border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)] dark:hover:bg-slate-900"
        title="Quick Search"
        aria-label="Quick Search"
      >
        <Search size={16} />
      </Button>

      {onMarkWordLearned && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAsLearnedClick}
          className="h-8 w-8 p-0 border border-slate-200 bg-background text-gray-700 hover:text-[var(--lv-accent)] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-[var(--lv-accent)] dark:hover:bg-slate-900"
          title="Mark as Learned"
          aria-label="Mark as Learned"
          disabled={!currentWord}
        >
          <CheckCircle
            size={16}
            className="text-emerald-600 dark:text-emerald-400"
          />
        </Button>
      )}

      <MarkAsLearnedDialog
        isOpen={isMarkAsLearnedDialogOpen}
        onClose={() => setIsMarkAsLearnedDialogOpen(false)}
        onConfirm={handleMarkAsLearnedConfirm}
        word={wordToMark}
      />
    </div>
  );
};

export default VocabularyControlsColumn;
