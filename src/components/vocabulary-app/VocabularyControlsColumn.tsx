
import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, SkipForward, Speaker, Search, CheckCircle } from 'lucide-react';
import SpeechRateControl from './SpeechRateControl';
import { useSpeechRate } from '@/hooks/useSpeechRate';
import { toast } from 'sonner';
import AddWordButton from './AddWordButton';
import EditWordButton from './EditWordButton';
import { VocabularyWord } from '@/types/vocabulary';
import { cn } from '@/lib/utils';
import { useVoiceContext } from '@/hooks/useVoiceContext';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { MarkAsLearnedDialog } from '@/components/MarkAsLearnedDialog';
import {
  trackMute,
  trackUnmute,
  trackPlay,
  trackPause,
  trackNextWord,
  trackCycleVoice
} from '@/lib/analytics/events';

interface VocabularyControlsColumnProps {
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onNextWord: () => void;
  onCycleVoice: () => void;
  currentWord: VocabularyWord | null;
  onOpenAddModal: () => void;
  onOpenEditModal: () => void;
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
  onOpenAddModal,
  onOpenEditModal,
  selectedVoiceName,
  playCurrentWord,
  onMarkWordLearned,
  onOpenSearch
}) => {
  const { speechRate, setSpeechRate } = useSpeechRate();
  const { allVoices } = useVoiceContext();
  
  const handleToggleMute = () => {
    onToggleMute();
    isMuted ? trackUnmute() : trackMute();
    toast(isMuted ? 'Audio unmuted' : 'Audio muted');
  };

  const handleTogglePause = () => {
    onTogglePause();
    isPaused ? trackPlay() : trackPause();
    toast(isPaused ? 'Playback resumed' : 'Playback paused');
  };

  const handleNextWord = () => {
    onNextWord();
    trackNextWord();
  };

  const handleCycleVoice = () => {
    if (allVoices.length === 0) {
      toast.warning('No voices available');
      return;
    }
    onCycleVoice();
    trackCycleVoice(selectedVoiceName);
  };

  const handleRateChange = (r: number) => {
    setSpeechRate(r);
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
        className="h-8 w-8 p-0 text-indigo-700 bg-indigo-50"
        title="Next Word"
        aria-label="Next Word"
      >
        <SkipForward size={16} />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCycleVoice}
        className="h-8 w-8 p-0 text-blue-700 border-blue-300 bg-blue-50 flex items-center justify-center"
        title={allVoices.length < 2 ? 'No other voices available' : 'Change Voice'}
        disabled={allVoices.length < 2}
        aria-label="Change Voice"
      >
        <Speaker size={16} />
      </Button>

      <SpeechRateControl rate={speechRate} onChange={handleRateChange} />

      <EditWordButton onClick={onOpenEditModal} disabled={!currentWord} />
      <AddWordButton onClick={onOpenAddModal} />
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
          className="h-8 w-8 p-0 text-red-600 border-red-300 bg-red-50"
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
