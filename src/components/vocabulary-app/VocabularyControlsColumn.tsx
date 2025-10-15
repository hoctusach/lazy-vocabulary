
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

const accentIconButtonClasses = {
  next:
    'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 dark:text-indigo-200 dark:border-indigo-800 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:hover:text-indigo-100',
  voice:
    'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-200 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:hover:text-blue-100',
  learned:
    'text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:text-red-300 dark:border-red-800 dark:bg-red-950 dark:hover:bg-red-900 dark:hover:text-red-200'
};

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
  
  const trackEvent = (name: string, label: string, value?: number) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, {
        event_category: 'interaction',
        event_label: label,
        ...(typeof value === 'number' ? { value } : {})
      });
    }
  };

  const handleToggleMute = () => {
    onToggleMute();
    trackEvent(isMuted ? 'unmute' : 'mute', isMuted ? 'Unmute' : 'Mute');
    toast(isMuted ? 'Audio unmuted' : 'Audio muted');
  };

  const handleTogglePause = () => {
    onTogglePause();
    trackEvent(isPaused ? 'play' : 'pause', isPaused ? 'Play' : 'Pause');
    toast(isPaused ? 'Playback resumed' : 'Playback paused');
  };

  const handleNextWord = () => {
    if (!currentWord) {
      toast.info('No words available in this category. Try switching categories or regenerate today\'s list.');
      return;
    }
    onNextWord();
    trackEvent('next_word', 'Next Word');
  };

  const handleCycleVoice = () => {
    if (allVoices.length === 0) {
      toast.warning('No voices available');
      return;
    }
    onCycleVoice();
    trackEvent('cycle_voice', selectedVoiceName);
  };

  const handleRateChange = (r: number) => {
    setSpeechRate(r);
    trackEvent('speech_rate_change', `${r}x`, r);
    unifiedSpeechController.stop();
    if (!isMuted && !isPaused) {
      playCurrentWord();
    }
  };

  const [isMarkAsLearnedDialogOpen, setIsMarkAsLearnedDialogOpen] = React.useState(false);
  const [wordToMark, setWordToMark] = React.useState('');
  const learnedSoundRef = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => {
    learnedSoundRef.current = new Audio('/beep2.wav');
  }, []);

  const handleMarkAsLearnedClick = () => {
    setWordToMark(currentWord?.word || '');
    setIsMarkAsLearnedDialogOpen(true);
  };
  const handleMarkAsLearnedConfirm = () => {
    if (onMarkWordLearned && wordToMark) onMarkWordLearned(wordToMark);
    setIsMarkAsLearnedDialogOpen(false);
    learnedSoundRef.current?.play().catch(() => {});
    toast('Word marked as learned.');
  };

  return (
    <div className="flex flex-col gap-2 items-end">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleMute}
        className={cn(
          'h-8 w-8 p-0',
          isMuted ? 'text-purple-700 border-purple-300 bg-purple-50' : 'text-gray-700'
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
          'h-8 w-8 p-0',
          isPaused ? 'text-orange-500 border-orange-300 bg-orange-50' : 'text-gray-700'
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
        className={cn('h-8 w-8 p-0', accentIconButtonClasses.next)}
        title="Next Word"
        aria-label="Next Word"
      >
        <SkipForward size={16} />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCycleVoice}
        className={cn('h-8 w-8 p-0', accentIconButtonClasses.voice)}
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
        onClick={() => onOpenSearch()}
        className="h-8 w-8 p-0"
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
          className={cn('h-8 w-8 p-0', accentIconButtonClasses.learned)}
          title="Mark as Learned"
          aria-label="Mark as Learned"
          disabled={!currentWord}
        >
          <CheckCircle size={16} />
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
