
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook for managing playback controls like mute and pause functionality
 * Now designed to start unmuted by default with auto-playback
 */
export const usePlaybackControls = (cancelSpeech: () => void, playCurrentWord: () => void) => {
  // Start with auto-playback enabled
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
  
  // Function to toggle mute with improved behavior
  const toggleMute = useCallback(() => {
    console.log('Toggle mute called');
    setMuted(prev => {
      const newMuted = !prev;
      
      if (newMuted) {
        // When muting, cancel any current speech
        console.log('Audio muted, speech canceled');
        cancelSpeech();
        toast.info("Audio playback muted");
      } else {
        // When unmuting, don't cancel speech - this was a key issue
        // Instead, restart playback of current word
        console.log('Unmuted, playback will resume with current word');
        
        // Don't use setTimeout here - it causes race conditions
        // Check paused state immediately and play if not paused
        if (!paused) {
          playCurrentWord();
          toast.success("Audio playback resumed");
        }
      }
      
      return newMuted;
    });
  }, [cancelSpeech, paused, playCurrentWord]);
  
  // Function to toggle pause with full speech handling
  const togglePause = useCallback(() => {
    setPaused(prev => {
      const newPaused = !prev;
      
      if (newPaused) {
        // When pausing, cancel current speech
        cancelSpeech();
        toast.info("Playback paused");
        console.log('Playback paused, speech canceled');
      } else {
        // When unpausing, play current word immediately
        console.log('Playback unpaused, will resume with current word');
        if (!muted) {
          playCurrentWord();
          toast.success("Playback resumed");
        }
      }
      
      return newPaused;
    });
  }, [cancelSpeech, muted, playCurrentWord]);
  
  return {
    muted,
    paused,
    toggleMute,
    togglePause
  };
};
