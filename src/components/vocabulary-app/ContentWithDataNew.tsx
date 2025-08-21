import React, { useMemo, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyMainNew from './VocabularyMainNew';
import AddWordModal from './AddWordModal';
import MedalCabinet from '@/components/MedalCabinet';
import StickerHistory from '@/components/StickerHistory';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ContentWithDataNewProps {
  displayWord: VocabularyWord;
  muted: boolean;
  paused: boolean;
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleCycleVoice: () => void;
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
  onMarkWordLearned?: (word: string) => void;
  additionalContent?: React.ReactNode;
  onOpenSearch?: (word?: string) => void;
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
  isAddWordModalOpen,
  handleCloseModal,
  handleSaveWord,
  isEditMode,
  wordToEdit,
  handleOpenAddWordModal,
  handleOpenEditWordModal,
  playCurrentWord,
  onMarkWordLearned,
  additionalContent,
  onOpenSearch
}) => {
  const editingWordData = useMemo(
    () => (
      isEditMode && wordToEdit
        ? {
            ...wordToEdit,
            translation: wordToEdit.translation || '',
            category: wordToEdit.category || displayWord.category
          }
        : undefined
    ),
    [isEditMode, wordToEdit, displayWord.category]
  );
  const [open, setOpen] = useState(false);
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
        isSoundPlaying={isSpeaking}
        handleManualNext={handleManualNext}
        displayTime={displayTime}
        selectedVoiceName={selectedVoiceName}
        onOpenAddModal={handleOpenAddWordModal}
        onOpenEditModal={() => handleOpenEditWordModal(displayWord)}
        playCurrentWord={playCurrentWord}
        onMarkWordLearned={onMarkWordLearned}
        onOpenSearch={onOpenSearch}
      />

      {additionalContent}

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
        <p>⭐ Speech won’t autoplay due to security. Sometimes, tap anywhere or any button (e.g. Next) to enable it.</p>
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
