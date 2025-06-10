
import { useEffect, useRef } from 'react';

interface UserInteractionProps {
  userInteractionRef: React.MutableRefObject<boolean>;
  playCurrentWord: () => void;
  playbackCurrentWord: any;
}

export const useUserInteractionHandler = ({
  userInteractionRef,
  playCurrentWord,
  playbackCurrentWord
}: UserInteractionProps) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    userInteractionRef.current = true;
    initializedRef.current = true;

    try {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      utterance.rate = 1;

      utterance.onend = () => {
        if (playbackCurrentWord) {
          setTimeout(() => {
            if (!userInteractionRef.current) return;
            playCurrentWord();
          }, 500);
        }
      };

      utterance.onerror = () => {
        initializedRef.current = true;
      };

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 200);
      } else {
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('Speech initialization error:', err);
      initializedRef.current = true;
    }
  }, [userInteractionRef, playCurrentWord, playbackCurrentWord]);
};
