import React, { useMemo, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyMainNew from './VocabularyMainNew';
import AddWordModal from './AddWordModal';
import MedalCabinet from '@/components/MedalCabinet';
import StickerHistory from '@/components/StickerHistory';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ContentWithDataNewProps {
  displayWord: VocabularyWord;
  muted: boolean;
  paused: boolean;
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleCycleVoice: () => void;
  handleSwitchCategory: () => void;
  currentCategory: string;
  nextCategory: string | null;
  isSpeaking: boolean;
  handleManualNext: () => void;
  displayTime: number;
  selectedVoiceName: string;
  isAddWordModalOpen: boolean;
  handleCloseModal: () => void;
  handleSaveWord: (wordData: { word: string; meaning: string; example: string; translation: string; category: string }) => void;
  isEditMode: boolean;
  wordToEdit: VocabularyWord | null;
  handleOpenAddWordModal: () => void;
  handleOpenEditWordModal: (word: VocabularyWord) => void;
  playCurrentWord: () => void;
}

const ContentWithDataNew: React.FC<ContentWithDataNewProps> = ({
  displayWord,
  muted,
  paused,
  toggleMute,
  handleTogglePause,
  handleCycleVoice,
  handleSwitchCategory,
  currentCategory,
  nextCategory,
  isSpeaking,
  handleManualNext,
  displayTime,
  selectedVoiceName,
  isAddWordModalOpen,
  handleCloseModal,
  handleSaveWord,
  isEditMode,
  wordToEdit,
  handleOpenAddWordModal,
  handleOpenEditWordModal,
  playCurrentWord
}) => {
  const [open, setOpen] = useState(false);
  const editingWordData = useMemo(
    () => (
      isEditMode && wordToEdit
        ? {
            ...wordToEdit,
            translation: wordToEdit.translation || '',
            category: wordToEdit.category || currentCategory
          }
        : undefined
    ),
    [isEditMode, wordToEdit, currentCategory]
  );
  return (
    <>
      {/* Main vocabulary display */}
      <VocabularyMainNew
        currentWord={displayWord}
        mute={muted}
        isPaused={paused}
        toggleMute={toggleMute}
        handleTogglePause={handleTogglePause}
        handleCycleVoice={handleCycleVoice}
        handleSwitchCategory={handleSwitchCategory}
        currentCategory={currentCategory}
        nextCategory={nextCategory}
        isSoundPlaying={isSpeaking}
        handleManualNext={handleManualNext}
        displayTime={displayTime}
      selectedVoiceName={selectedVoiceName}
      onOpenAddModal={handleOpenAddWordModal}
      onOpenEditModal={() => handleOpenEditWordModal(displayWord)}
      playCurrentWord={playCurrentWord}
      />

      {/* Achievements and learning days */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 mt-4 mb-2">
          <span className="font-semibold">Streaks</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          <MedalCabinet />
          <StickerHistory />
        </CollapsibleContent>
      </Collapsible>

      {/* Mobile speech note statically above debug panel */}
      <div className="mobile-note text-xs italic text-gray-500 text-left my-2">
        <p>⭐ Tap any button (e.g., Next) to enable speech.</p>
        <p>⭐ On Mobile, only one voice may be available.</p>
        <p>
          ⭐ No personal login or data is stored on any server. Your progress
          (stickers, rewards) is saved locally in your browser on your device.
          Available voices depend on your browser and device—at first, try
          different browsers to find the best one for learning. Make sure you
          use the same device and browser to keep your progress.
        </p>
      </div>


      
      {/* Enhanced Word Modal (handles both add and edit) */}
      <AddWordModal
        isOpen={isAddWordModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveWord}
        editMode={isEditMode}
        wordToEdit={editingWordData}
      />
    </>
  );
};

export default ContentWithDataNew;
