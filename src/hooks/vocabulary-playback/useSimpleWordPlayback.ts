
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from './useVoiceSelection';
import { useSimpleSpeech } from '@/hooks/speech/useSimpleSpeech';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';

/**
 * Simplified word playback with improved coordination and pause handling
 */
export const useSimpleWordPlayback = (
  selectedVoice: VoiceSelection,
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  goToNextWord: () => void,
  muted: boolean,
  paused: boolean
) => {
  const { speak, stop, isSpeaking } = useSimpleSpeech();
  const playingRef = useRef(false);

  const playWord = useCallback(async (word: VocabularyWord) => {
    const playbackId = Math.random().toString(36).substring(7);
    console.log(`[WORD-PLAYBACK-${playbackId}] Playing word: ${word.word}`);

    // Check if speech controller is paused - this is the critical check
    if (simpleSpeechController.isPaused()) {
      console.log(`[WORD-PLAYBACK-${playbackId}] Speech controller is paused, skipping playback`);
      return;
    }

    // Check local conditions
    if (muted || paused) {
      console.log(`[WORD-PLAYBACK-${playbackId}] Skipping - muted: ${muted}, paused: ${paused}`);
      return;
    }

    // Prevent overlapping playback
    if (playingRef.current) {
      console.log(`[WORD-PLAYBACK-${playbackId}] Already playing, skipping`);
      return;
    }

    playingRef.current = true;

    try {
      // Find the appropriate voice
      const voice = findVoice(selectedVoice.region);
      console.log(`[WORD-PLAYBACK-${playbackId}] Using voice: ${voice?.name || 'default'}`);

      // Create speech text
      const speechText = `${word.word}. ${word.meaning || ''}. ${word.example || ''}`.trim();
      
      if (!speechText || speechText.length === 0) {
        console.log(`[WORD-PLAYBACK-${playbackId}] No content to speak`);
        playingRef.current = false;
        setTimeout(() => {
          if (!paused && !muted) goToNextWord();
        }, 1500);
        return;
      }

      console.log(`[WORD-PLAYBACK-${playbackId}] Starting speech`);

      const success = await speak(speechText, {
        voice,
        onComplete: () => {
          console.log(`[WORD-PLAYBACK-${playbackId}] Speech completed, checking auto-advance`);
          playingRef.current = false;
          
          // Check all conditions before auto-advancing
          if (!paused && !muted && !simpleSpeechController.isPaused()) {
            console.log(`[WORD-PLAYBACK-${playbackId}] Auto-advancing to next word`);
            setTimeout(() => {
              // Double-check state before advancing
              if (!paused && !muted && !simpleSpeechController.isPaused()) {
                goToNextWord();
              } else {
                console.log(`[WORD-PLAYBACK-${playbackId}] State changed during delay, skipping auto-advance`);
              }
            }, 1500);
          } else {
            console.log(`[WORD-PLAYBACK-${playbackId}] Not auto-advancing - paused: ${paused}, muted: ${muted}, controllerPaused: ${simpleSpeechController.isPaused()}`);
          }
        },
        onError: () => {
          console.log(`[WORD-PLAYBACK-${playbackId}] Speech error, advancing anyway`);
          playingRef.current = false;
          
          // Still advance on error to prevent getting stuck
          if (!paused && !muted && !simpleSpeechController.isPaused()) {
            setTimeout(() => goToNextWord(), 2000);
          }
        }
      });

      if (!success) {
        console.log(`[WORD-PLAYBACK-${playbackId}] Speech failed to start, advancing`);
        playingRef.current = false;
        if (!paused && !muted && !simpleSpeechController.isPaused()) {
          setTimeout(() => goToNextWord(), 2000);
        }
      }

    } catch (error) {
      console.error(`[WORD-PLAYBACK-${playbackId}] Exception:`, error);
      playingRef.current = false;
      
      // Always advance on exception
      if (!paused && !muted && !simpleSpeechController.isPaused()) {
        setTimeout(() => goToNextWord(), 2000);
      }
    }
  }, [speak, selectedVoice, findVoice, goToNextWord, muted, paused]);

  const stopPlayback = useCallback(() => {
    console.log('[WORD-PLAYBACK] Stopping playback');
    stop();
    playingRef.current = false;
  }, [stop]);

  return {
    playWord,
    stopPlayback,
    isSpeaking,
    isPlaying: playingRef.current
  };
};
