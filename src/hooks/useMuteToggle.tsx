
import { useState, useCallback, useEffect } from 'react';
import { stopSpeaking, speak } from '@/utils/speech';
import { VocabularyWord } from '@/types/vocabulary';

export const useMuteToggle = (
  isMuted: boolean, 
  handleToggleMute: () => void,
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  clearAutoAdvanceTimer: () => void,
  stopSpeaking: () => void,
  voiceRegion: 'US' | 'UK'
) => {
  const [mute, setMute] = useState(isMuted);
  
  // Sync with parent mute state
  useEffect(() => {
    setMute(isMuted);
  }, [isMuted]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    setMute(!mute);
    handleToggleMute();
    
    if (!mute) {
      console.log('[APP] Muting, stopping speech');
      stopSpeaking();
      clearAutoAdvanceTimer();
    } else if (currentWord && !isPaused) {
      // If unmuting, play the current word after a short delay
      console.log('[APP] Unmuting, playing current word');
      setTimeout(() => {
        const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
        console.log('[APP] ⚡ Speaking after unmute:', currentWord.word);
        speak(fullText, voiceRegion);
      }, 300); // Small delay to ensure UI is updated
    }
  }, [mute, currentWord, isPaused, voiceRegion, handleToggleMute, stopSpeaking, clearAutoAdvanceTimer]);
  
  return { mute, toggleMute };
};
