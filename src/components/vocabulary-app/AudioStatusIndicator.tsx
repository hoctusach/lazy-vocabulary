
import React from 'react';
import { VolumeX } from 'lucide-react';

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
  if (!hasInitialized && interactionCount === 0) {
    return (
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
        <VolumeX className="h-4 w-4" />
        <span className="text-sm">Click anywhere to enable audio</span>
      </div>
    );
  }

  // Hide the indicator once initialization has started or audio is unlocked
  if (hasInitialized || isAudioUnlocked) {
    return null;
  }

  return null;
};

export default AudioStatusIndicator;
