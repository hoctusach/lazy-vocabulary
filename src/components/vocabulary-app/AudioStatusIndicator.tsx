
import React from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

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

  if (hasInitialized && !isAudioUnlocked) {
    return (
      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Initializing audio...</span>
      </div>
    );
  }

  if (isAudioUnlocked) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
        <Volume2 className="h-4 w-4" />
        <span className="text-sm">Audio ready</span>
      </div>
    );
  }

  return null;
};

export default AudioStatusIndicator;
