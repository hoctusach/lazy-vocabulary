
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

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
        unifiedSpeechController.setMuted(!!savedMuted);
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
      unifiedSpeechController.setMuted(newMuted);

      if (newMuted) {
        toast.info("Audio playback muted");
      } else {
        if (!paused) {
          playCurrentWord();
          toast.success("Audio playback resumed");
        }
      }

      return newMuted;
    });
  }, [paused, playCurrentWord]);
  
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
        playCurrentWord();
        toast.success("Playback resumed");
      }

      return newPaused;
    });
  }, [cancelSpeech, playCurrentWord]);
  
  return {
    muted,
    paused,
    toggleMute,
    togglePause
  };
};
