
import { useState, useCallback, useRef, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useAudioControl = (wordList: VocabularyWord[]) => {
  // Audio state
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Load initial mute state from local storage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { muted: savedMuted } = JSON.parse(savedSettings);
        setMuted(!!savedMuted);
      }
    } catch (error) {
      console.error('Error loading saved mute setting:', error);
    }
  }, []);
  
  // Save muted state to localStorage
  useEffect(() => {
    try {
      const settings = localStorage.getItem('vocabularySettings');
      const parsedSettings = settings ? JSON.parse(settings) : {};
      
      localStorage.setItem('vocabularySettings', JSON.stringify({
        ...parsedSettings,
        muted
      }));
    } catch (error) {
      console.error('Error saving mute setting:', error);
    }
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
