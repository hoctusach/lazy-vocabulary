
import { useEffect, useRef, useState } from 'react';

interface AutoPlayProps {
  hasData: boolean;
  currentWord: any | null;
  userInteractionRef: React.MutableRefObject<boolean>;
  playCurrentWord: () => void;
}

export const useAutoPlayOnDataLoad = ({
  hasData,
  currentWord,
  userInteractionRef,
  playCurrentWord,
}: AutoPlayProps) => {
  const [hasUserInteracted, setHasUserInteracted] = useState(userInteractionRef.current);
  const hasAutoPlayedRef = useRef(false);

  // Track changes to the ref in a state variable so effects re-run
  useEffect(() => {
    setHasUserInteracted(userInteractionRef.current);
  }, [userInteractionRef.current]);

  // Force audio to play when data becomes available
  useEffect(() => {
    if (hasData && currentWord && hasUserInteracted && !hasAutoPlayedRef.current) {
      console.log('Data loaded and user has interacted, triggering playback');
      hasAutoPlayedRef.current = true;
      // Small delay to ensure rendering completes
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
