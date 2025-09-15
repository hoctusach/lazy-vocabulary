
import { useState, useCallback, useRef, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { getPreferences, savePreferences } from '@/lib/db/preferences';

export const useAudioControl = (wordList: VocabularyWord[]) => {
  // Audio state
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Load initial mute state from DB
  useEffect(() => {
    getPreferences()
      .then(p => setMuted(!!p.is_muted))
      .catch(err => console.error('Error loading mute setting', err));
  }, []);

  // Persist muted state
  useEffect(() => {
    savePreferences({ is_muted: muted }).catch(err => {
      console.error('Error saving mute setting', err);
    });
  }, [muted]);
  
  // Function to cancel any speech
  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);
  
  // Handle mute toggling
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      
      if (newMuted) {
        // When muting, cancel any current speech
        cancelSpeech();
      }
      
      return newMuted;
    });
  }, [cancelSpeech]);
  
  // Handle pause toggling
  const togglePause = useCallback(() => {
    setPaused(prev => {
      const newPaused = !prev;
      
      if (newPaused) {
        // When pausing, cancel current speech
        cancelSpeech();
      }
      
      return newPaused;
    });
  }, [cancelSpeech]);
  
  return {
    muted,
    paused,
    utteranceRef,
    cancelSpeech,
    toggleMute,
    togglePause
  };
};
