
import React from 'react';

interface AudioStatusIndicatorProps {
  isAudioUnlocked: boolean;
  hasInitialized: boolean;
  interactionCount: number;
}

const AudioStatusIndicator: React.FC<AudioStatusIndicatorProps> = ({
  isAudioUnlocked,
  hasInitialized,
  interactionCount
}) => {
  // Audio playback no longer requires user interaction
  return null;
};

export default AudioStatusIndicator;
