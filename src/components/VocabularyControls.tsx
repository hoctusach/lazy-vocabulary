
import React from "react";

// This component has been deprecated as controls are now inside the VocabularyCard
// Keeping an empty implementation to avoid breaking imports
interface VocabularyControlsProps {
  mute: boolean;
  isPaused: boolean;
  isSoundPlaying: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onNext: () => void;
  onPlay?: () => void;
  onChangeVoice: () => void;
  onSwitchCategory: () => void;
  currentCategory: string;
  nextCategory: string;
  voiceOption: string;
  displayTime?: number;
}

const VocabularyControls: React.FC<VocabularyControlsProps> = () => {
  // This component is now empty as controls are handled inside VocabularyCard
  return null;
};

export default VocabularyControls;
