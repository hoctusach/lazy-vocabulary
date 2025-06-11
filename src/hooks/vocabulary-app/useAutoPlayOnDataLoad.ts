
import { useEffect, useState } from 'react';

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

  // Track changes to the ref in a state variable so effects re-run
  useEffect(() => {
    setHasUserInteracted(userInteractionRef.current);
  }, [userInteractionRef.current]);

  // Force audio to play when data becomes available
  useEffect(() => {
    if (hasData && currentWord && hasUserInteracted) {
      console.log('Data loaded and user has interacted, triggering playback');
      // Small delay to ensure rendering completes
      const timerId = setTimeout(() => {
        playCurrentWord();
      }, 500);
      return () => clearTimeout(timerId);
    }
  }, [hasData, currentWord, hasUserInteracted, playCurrentWord]);
};
