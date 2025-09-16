
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import {
  getLocalPreferences,
  saveLocalPreferences,
} from '@/lib/preferences/localPreferences';

/**
 * Hook for managing playback controls like mute and pause functionality
 * Now designed to start unmuted by default with auto-playback
 */
export const usePlaybackControls = (cancelSpeech: () => void, playCurrentWord: () => void) => {
  // Start with auto-playback enabled
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  
  // Load initial settings
  useEffect(() => {
    getLocalPreferences()
      .then(p => {
        setMuted(!!p.is_muted);
        unifiedSpeechController.setMuted(!!p.is_muted);
        setPaused(!p.is_playing);
      })
      .catch(err => console.error('Error loading playback prefs', err));
  }, []);

  // Save mute state
  useEffect(() => {
    saveLocalPreferences({ is_muted: muted }).catch(err =>
      console.error('Error saving mute pref', err),
    );
  }, [muted]);

  // Save playing state
  useEffect(() => {
    saveLocalPreferences({ is_playing: !paused }).catch(err =>
      console.error('Error saving play pref', err),
    );
  }, [paused]);
  
  // Function to toggle mute with improved behavior
  const toggleMute = useCallback(() => {
    console.log('Toggle mute called');
    setMuted(prev => {
      const newMuted = !prev;

      if (newMuted) {
        cancelSpeech();
        unifiedSpeechController.setMuted(true);
        playCurrentWord();
        toast.info("Audio playback muted");
      } else {
        unifiedSpeechController.setMuted(false);
        if (!paused) {
          playCurrentWord();
          toast.success("Audio playback resumed");
        }
      }

      return newMuted;
    });
  }, [paused, playCurrentWord, cancelSpeech]);
  
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
