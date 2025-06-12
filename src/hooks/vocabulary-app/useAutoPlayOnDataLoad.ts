
import { useEffect, useRef } from 'react';
import { unlockAudio } from '@/utils/speech/core/modules/speechUnlock';

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

  // Force audio to play when data becomes available
  useEffect(() => {
    if (hasData && currentWord && hasUserInteracted && !hasAutoPlayedRef.current) {
      console.log('Data loaded and user has interacted, triggering playback');
      hasAutoPlayedRef.current = true;

      const timerId = setTimeout(async () => {
        await unlockAudio();
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
