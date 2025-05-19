
import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for managing playback controls like mute and pause functionality
 */
export const usePlaybackControls = (cancelSpeech: () => void, playCurrentWord: () => void) => {
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // Load initial settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { muted: savedMuted } = JSON.parse(savedSettings);
        setMuted(!!savedMuted);
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  }, []);
  
  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      localStorage.setItem('vocabularySettings', JSON.stringify({
        ...settings,
        muted
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [muted]);
  
  // Function to toggle mute with full speech handling
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
  
  // Function to toggle pause with full speech handling
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
    toggleMute,
    togglePause
  };
};
