
import { useState } from 'react';

/**
 * Hook for managing playback state and speech permissions
 */
export const usePlaybackState = () => {
  // State for speech permission
  const [hasSpeechPermission, setHasSpeechPermission] = useState(true);
  
  return {
    hasSpeechPermission,
    setHasSpeechPermission
  };
};
