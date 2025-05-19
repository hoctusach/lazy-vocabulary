
import { VocabularyWord } from '@/types/vocabulary';

interface UserInteractionHandlersProps {
  userInteractionRef: React.MutableRefObject<boolean>;
  goToNextWord: () => void;
  togglePause: () => void;
  cycleVoice: () => void;
  toggleMute: () => void;
  handleSwitchCategory: (current: string, next: string) => void;
  currentCategory: string;
  nextCategory: string | null;
}

export const useUserInteractionHandlers = ({
  userInteractionRef,
  goToNextWord,
  togglePause,
  cycleVoice,
  toggleMute,
  handleSwitchCategory,
  currentCategory,
  nextCategory
}: UserInteractionHandlersProps) => {
  // Handle category switch with explicit user interaction tracking
  const handleCategorySwitchDirect = () => {
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
    if (typeof nextCategory === 'string') {
      console.log(`Switching directly to category: ${nextCategory}`);
      handleSwitchCategory(currentCategory, nextCategory);
    }
  };

  // Handle manual next with explicit user interaction
  const handleManualNext = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    goToNextWord();
  };

  // Handle toggle pause with explicit user interaction
  const handleTogglePauseWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    togglePause();
  };

  // Handle voice cycling with explicit user interaction
  const handleCycleVoiceWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    cycleVoice();
  };

  // Handle toggle mute with explicit user interaction
  const handleToggleMuteWithInteraction = () => {
    // This is definitely user interaction
    userInteractionRef.current = true;
    toggleMute();
  };

  return {
    handleCategorySwitchDirect,
    handleManualNext,
    handleTogglePauseWithInteraction,
    handleCycleVoiceWithInteraction,
    handleToggleMuteWithInteraction
  };
};
