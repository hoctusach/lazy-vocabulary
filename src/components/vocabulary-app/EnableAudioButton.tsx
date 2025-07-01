import React from 'react';
import { markUserInteraction } from '@/utils/userInteraction';

interface Props {
  onEnable?: () => void;
}

const EnableAudioButton: React.FC<Props> = ({ onEnable }) => {
  const handleClick = () => {
    markUserInteraction();
    onEnable?.();
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
    >
      Tap to enable audio
    </button>
  );
};

export default EnableAudioButton;
