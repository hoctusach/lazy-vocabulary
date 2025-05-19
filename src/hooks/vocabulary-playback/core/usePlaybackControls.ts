
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

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
  
  // Function to toggle mute with improved behavior
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      
      if (newMuted) {
        // When muting, cancel any current speech
        cancelSpeech();
        console.log('Audio muted, speech canceled');
      } else {
        // When unmuting, don't cancel speech - this was a key issue
        // Instead, restart playback of current word
        console.log('Unmuted, playback will resume with current word');
        
        // Short delay to ensure state is updated before playing
        setTimeout(() => {
          if (!paused) {
            playCurrentWord();
            toast.success("Audio playback resumed");
          }
        }, 150);
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
        console.log('Playback paused, speech canceled');
      } else {
        // When unpausing, play current word after a short delay
        console.log('Playback unpaused, will resume with current word');
        if (!muted) {
          setTimeout(() => {
            playCurrentWord();
          }, 150);
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
