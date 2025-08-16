
import { useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from './useVoiceSelection';
import { useSimpleSpeech } from '@/hooks/speech/useSimpleSpeech';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { formatSpeechText } from '@/utils/speech';

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
    if (unifiedSpeechController.isPaused()) {
      console.log(`[WORD-PLAYBACK-${playbackId}] Speech controller is paused, skipping playback`);
      return;
    }

    // Check local conditions
    if (paused) {
      console.log(`[WORD-PLAYBACK-${playbackId}] Skipping - paused: ${paused}`);
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

      // Create speech text with consistent pauses
      const speechText = formatSpeechText({
        word: word.word,
        meaning: word.meaning || '',
        example: word.example || ''
      });
      
      if (!speechText || speechText.length === 0) {
        console.log(`[WORD-PLAYBACK-${playbackId}] No content to speak`);
        playingRef.current = false;
        if (!paused) {
          goToNextWord();
        }
        return;
      }

      console.log(`[WORD-PLAYBACK-${playbackId}] Starting speech`);

      unifiedSpeechController.setMuted(muted);

      const success = await speak(speechText, {
        voice,
        region: selectedVoice.region,
        onComplete: () => {
          console.log(`[WORD-PLAYBACK-${playbackId}] Speech completed, checking auto-advance`);
          playingRef.current = false;

          if (!paused && !unifiedSpeechController.isPaused()) {
            console.log(`[WORD-PLAYBACK-${playbackId}] Auto-advancing to next word`);
            goToNextWord();
          } else {
            console.log(`[WORD-PLAYBACK-${playbackId}] Not auto-advancing - paused: ${paused}, controllerPaused: ${unifiedSpeechController.isPaused()}, muted: ${muted}`);
          }
        },
        onError: () => {
          console.log(`[WORD-PLAYBACK-${playbackId}] Speech error, advancing anyway`);
          playingRef.current = false;

          if (!paused && !unifiedSpeechController.isPaused()) {
            goToNextWord();
          }
        }
      });

      if (!success) {
        console.log(`[WORD-PLAYBACK-${playbackId}] Speech failed to start, advancing`);
        playingRef.current = false;
        if (!paused && !unifiedSpeechController.isPaused()) {
          goToNextWord();
        }
      }

    } catch (error) {
      console.error(`[WORD-PLAYBACK-${playbackId}] Exception:`, error);
      playingRef.current = false;

      if (!paused && !unifiedSpeechController.isPaused()) {
        goToNextWord();
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
