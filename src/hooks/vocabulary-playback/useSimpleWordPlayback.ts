
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from './useVoiceSelection';
import { useSimpleSpeech } from '@/hooks/speech/useSimpleSpeech';

/**
 * Simplified word playback with clean auto-advance
 */
export const useSimpleWordPlayback = (
  selectedVoice: VoiceSelection,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  goToNextWord: () => void,
  muted: boolean,
  paused: boolean
) => {
  const { speak, stop, isSpeaking } = useSimpleSpeech();
  const playingRef = useRef(false);

  const playWord = useCallback(async (word: VocabularyWord) => {
    const playbackId = Math.random().toString(36).substring(7);
    console.log(`[WORD-PLAYBACK-${playbackId}] Playing word: ${word.word}`);

    // Prevent overlapping playback
    if (playingRef.current) {
      console.log(`[WORD-PLAYBACK-${playbackId}] Already playing, skipping`);
      return;
    }

    // Check conditions
    if (muted || paused) {
      console.log(`[WORD-PLAYBACK-${playbackId}] Skipping - muted: ${muted}, paused: ${paused}`);
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
        setTimeout(() => goToNextWord(), 1500);
        return;
      }

      console.log(`[WORD-PLAYBACK-${playbackId}] Starting speech`);

      const success = await speak(speechText, {
        voice,
        onComplete: () => {
          console.log(`[WORD-PLAYBACK-${playbackId}] Speech completed, auto-advancing`);
          playingRef.current = false;
          
          // Auto-advance with state check
          if (!paused && !muted) {
            setTimeout(() => {
              if (!paused && !muted) {
                goToNextWord();
              }
            }, 1500);
          }
        },
        onError: () => {
          console.log(`[WORD-PLAYBACK-${playbackId}] Speech error, advancing anyway`);
          playingRef.current = false;
          
          // Still advance on error to prevent getting stuck
          if (!paused && !muted) {
            setTimeout(() => goToNextWord(), 2000);
          }
        }
      });

      if (!success) {
        console.log(`[WORD-PLAYBACK-${playbackId}] Speech failed to start, advancing`);
        playingRef.current = false;
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 2000);
        }
      }

    } catch (error) {
      console.error(`[WORD-PLAYBACK-${playbackId}] Exception:`, error);
      playingRef.current = false;
      
      // Always advance on exception
      if (!paused && !muted) {
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
