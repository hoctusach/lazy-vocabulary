
import { useEffect, useRef } from 'react';

interface AutoPlayProps {
  hasData: boolean;
  currentWord: any | null;
  hasUserInteracted: boolean;
  playCurrentWord: () => void;
}

export const useAutoPlayOnDataLoad = ({
  hasData,
  currentWord,
  hasUserInteracted,
  playCurrentWord,
}: AutoPlayProps) => {
  const hasAutoPlayedRef = useRef(false);

  // Trigger playback when data becomes available
  useEffect(() => {
    if (hasData && currentWord && hasUserInteracted && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;

      const timerId = setTimeout(() => {
        playCurrentWord();
      }, 500);
      return () => clearTimeout(timerId);
    }

    // Reset flag if data becomes unavailable
    if (!hasData || !currentWord) {
      hasAutoPlayedRef.current = false;
    }
  }, [hasData, currentWord, hasUserInteracted, playCurrentWord]);
};
