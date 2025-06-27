
import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, RefreshCw, SkipForward, Speaker, Search } from 'lucide-react';
import { toast } from 'sonner';
import AddWordButton from './AddWordButton';
import EditWordButton from './EditWordButton';
import WordSearchModal from './WordSearchModal';
import { VocabularyWord } from '@/types/vocabulary';
import { cn } from '@/lib/utils';
import { getCategoryLabel, getCategoryMessageLabel } from '@/utils/categoryLabels';

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
  const nextCategoryMessageLabel = getCategoryMessageLabel(safeNextCategory);

  const handleToggleMute = () => {
    onToggleMute();
    toast(isMuted ? 'Audio unmuted' : 'Audio muted');
  };

  const handleTogglePause = () => {
    onTogglePause();
    toast(isPaused ? 'Playback resumed' : 'Playback paused');
  };

  const handleNextWord = () => {
    onNextWord();
  };

  const handleSwitchCategory = () => {
    onSwitchCategory();
    toast(`Switched to ${nextCategoryMessageLabel}`);
  };

  const handleCycleVoice = () => {
    onCycleVoice();
    toast(`Voice changed to ${nextVoiceLabel}`);
  };

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

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
      >
        {isPaused ? <Play size={16} /> : <Pause size={16} />}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNextWord}
        className="h-8 w-8 p-0 text-indigo-700 bg-indigo-50"
        title="Next Word"
      >
        <SkipForward size={16} />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSwitchCategory}
        className="h-8 w-8 p-0 text-green-700"
        title={`Switch to ${nextCategoryLabel}`}
      >
        <RefreshCw size={16} />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCycleVoice}
        className="h-8 w-8 p-0 text-blue-700 border-blue-300 bg-blue-50"
        title={`Change to ${nextVoiceLabel}`}
        aria-label={nextVoiceLabel}
      >
        <Speaker size={16} />
      </Button>


      <EditWordButton onClick={onOpenEditModal} disabled={!currentWord} />
      <AddWordButton onClick={onOpenAddModal} />
      <Button
        variant="outline"
        size="sm"
        onClick={openSearch}
        className="h-8 w-8 p-0"
        title="Quick Search"
      >
        <Search size={16} />
      </Button>
      <WordSearchModal isOpen={isSearchOpen} onClose={closeSearch} />
    </div>
  );
};

export default VocabularyControlsColumn;
