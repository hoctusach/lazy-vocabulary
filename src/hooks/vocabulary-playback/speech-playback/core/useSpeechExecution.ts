
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../../useVoiceSelection';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';

/**
 * Hook for executing speech with the simplified speech controller
 */
export const useSpeechExecution = (
  selectedVoice: VoiceSelection,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  setIsSpeaking: (isSpeaking: boolean) => void,
  isPlayingRef: React.MutableRefObject<boolean>,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  const executeSpeech = useCallback(async (
    wordToPlay: VocabularyWord,
    speechText: string
  ): Promise<boolean> => {
    console.log(`[SPEECH-EXECUTION] Starting speech for: ${wordToPlay.word}`);
    
    // Stop any ongoing speech
    simpleSpeechController.stop();
    
    try {
      const voice = findVoice(selectedVoice.region);
      
      console.log('[SPEECH-EXECUTION] Speaking with voice:', voice?.name || 'default system voice');
      
      const success = await simpleSpeechController.speak(speechText, {
        voice,
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        onStart: () => {
          console.log(`[SPEECH-EXECUTION] Speech started for: ${wordToPlay.word}`);
          setIsSpeaking(true);
        },
        onEnd: () => {
          console.log(`[SPEECH-EXECUTION] Speech ended for: ${wordToPlay.word}`);
          setIsSpeaking(false);
          isPlayingRef.current = false;
          
          // Auto-advance
          if (!paused && !muted) {
            console.log("[SPEECH-EXECUTION] Auto-advancing to next word");
            setTimeout(() => advanceToNext(), 1500);
          }
        },
        onError: (event) => {
          console.error(`[SPEECH-EXECUTION] Speech error: ${event.error} for word ${wordToPlay.word}`);
          setIsSpeaking(false);
          isPlayingRef.current = false;
          
          // Still advance on error to prevent getting stuck
          if (!paused && !muted) {
            setTimeout(() => advanceToNext(), 1000);
          }
        }
      });
      
      if (!success) {
        console.warn('[SPEECH-EXECUTION] Speech failed to start');
        setIsSpeaking(false);
        isPlayingRef.current = false;
        if (!paused && !muted) {
          setTimeout(() => advanceToNext(), 2000);
        }
      }

      return success;
    } catch (error) {
      console.error("[SPEECH-EXECUTION] Error in executeSpeech:", error);
      setIsSpeaking(false);
      isPlayingRef.current = false;
      if (!paused && !muted) {
        setTimeout(() => advanceToNext(), 2000);
      }
      return false;
    }
  }, [selectedVoice, findVoice, setIsSpeaking, isPlayingRef, advanceToNext, muted, paused]);

  return {
    executeSpeech
  };
};
