
import { useEffect } from 'react';

interface AutoPlayProps {
  hasData: boolean;
  wordList: any[] | null;
  userInteractionRef: React.MutableRefObject<boolean>;
  playCurrentWord: () => void;
}

export const useAutoPlayOnDataLoad = ({
  hasData,
  wordList,
  userInteractionRef,
  playCurrentWord,
}: AutoPlayProps) => {
  // Force audio to play when data becomes available
  useEffect(() => {
    if (hasData && wordList && wordList.length > 0 && userInteractionRef.current) {
      console.log('Data loaded and user has interacted, triggering playback');
      // Small delay to ensure rendering completes
      const timerId = setTimeout(() => {
        playCurrentWord();
      }, 500);
      return () => clearTimeout(timerId);
    }
  }, [hasData, wordList, userInteractionRef.current, playCurrentWord]);
};
