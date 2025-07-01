
import React from 'react';

interface AudioStatusIndicatorProps {
  isAudioUnlocked: boolean;
  hasInitialized: boolean;
}

const AudioStatusIndicator: React.FC<AudioStatusIndicatorProps> = ({
  isAudioUnlocked,
  hasInitialized
}) => {
  const handleResume = () => {
    window.dispatchEvent(new Event('resume-speech'));
  };

  if (hasInitialized && isAudioUnlocked) {
    return null;
  }

  return (
    <div className="flex justify-center mt-2">
      <button
        onClick={handleResume}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {hasInitialized ? 'Resume Audio' : 'Start'}
      </button>
    </div>
  );
};

export default AudioStatusIndicator;
