import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, RefreshCw, SkipForward } from 'lucide-react';
import AddWordButton from './AddWordButton';
import EditWordButton from './EditWordButton';
import { VocabularyWord } from '@/types/vocabulary';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/utils/categoryLabels';

interface VocabularyControlsColumnProps {
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onNextWord: () => void;
  onSwitchCategory: () => void;
  onCycleVoice: () => void;
  nextCategory: string;
  nextVoiceLabel: string;
  currentWord: VocabularyWord | null;
  onOpenAddModal: () => void;
  onOpenEditModal: () => void;
}

const VocabularyControlsColumn: React.FC<VocabularyControlsColumnProps> = ({
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onNextWord,
  onSwitchCategory,
  onCycleVoice,
  nextCategory,
  nextVoiceLabel,
  currentWord,
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const safeNextCategory = nextCategory || 'Next';
  const nextCategoryLabel = getCategoryLabel(safeNextCategory);

  return (
    <div className="flex flex-col gap-2 items-stretch">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleMute}
        className={cn(
          'h-6 text-xs px-1.5',
          isMuted ? 'text-purple-700 border-purple-300 bg-purple-50' : 'text-gray-700'
        )}
      >
        {isMuted ? <VolumeX size={12} className="mr-1" /> : <Volume2 size={12} className="mr-1" />}
        {isMuted ? 'Unmute' : 'Mute'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onTogglePause}
        className={cn(
          'h-6 text-xs px-1.5',
          isPaused ? 'text-orange-500 border-orange-300 bg-orange-50' : 'text-gray-700'
        )}
      >
        {isPaused ? <Play size={12} className="mr-1" /> : <Pause size={12} className="mr-1" />}
        {isPaused ? 'Play' : 'Pause'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onNextWord}
        className="h-6 text-xs px-1.5 text-indigo-700 bg-indigo-50"
      >
        <SkipForward size={12} className="mr-1" />
        Next
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onSwitchCategory}
        className="h-6 text-xs px-1.5 text-green-700"
      >
        <RefreshCw size={10} className="mr-1" />
        {nextCategoryLabel}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onCycleVoice}
        className="h-6 text-xs px-1.5 text-blue-700 border-blue-300 bg-blue-50"
      >
        {nextVoiceLabel}
      </Button>

      <EditWordButton onClick={onOpenEditModal} disabled={!currentWord} />
      <AddWordButton onClick={onOpenAddModal} />
    </div>
  );
};

export default VocabularyControlsColumn;
