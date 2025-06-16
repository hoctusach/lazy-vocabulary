
import { useCallback, useRef, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';

/**
 * Simplified speech hook with minimal complexity and maximum reliability
 */
export const useSimpleSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentSpeechRef = useRef<string | null>(null);

  const speak = useCallback(async (
    text: string,
    options: {
      voice?: SpeechSynthesisVoice | null;
      onComplete?: () => void;
      onError?: () => void;
    } = {}
  ): Promise<boolean> => {
    const speechId = Math.random().toString(36).substring(7);
    console.log(`[SIMPLE-SPEECH-${speechId}] Starting speech: "${text.substring(0, 30)}..."`);

    // Basic validation
    if (!text || text.trim().length === 0) {
      console.log(`[SIMPLE-SPEECH-${speechId}] No text to speak`);
      return false;
    }

    // Stop any current speech
    if (isSpeaking) {
      console.log(`[SIMPLE-SPEECH-${speechId}] Stopping current speech before starting new one`);
      simpleSpeechController.stop();
      setIsSpeaking(false);
      await new Promise(r => setTimeout(r, 100));
    }

    currentSpeechRef.current = text;
    setIsSpeaking(true);

    try {
      // Create a minimal VocabularyWord object from the text
      const wordObject: VocabularyWord = {
        word: text,
        meaning: '',
        example: '',
        count: 0
      };

      const success = await simpleSpeechController.speak(wordObject, 'US', {
        voice: options.voice,
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        onStart: () => {
          console.log(`[SIMPLE-SPEECH-${speechId}] Speech started successfully`);
        },
        onEnd: () => {
          console.log(`[SIMPLE-SPEECH-${speechId}] Speech completed successfully`);
          setIsSpeaking(false);
          currentSpeechRef.current = null;
          if (options.onComplete) {
            options.onComplete();
          }
        },
        onError: (event) => {
          console.log(`[SIMPLE-SPEECH-${speechId}] Speech error: ${event.error}`);
          setIsSpeaking(false);
          currentSpeechRef.current = null;
          if (options.onError) {
            options.onError();
          }
        }
      });

      if (!success) {
        console.log(`[SIMPLE-SPEECH-${speechId}] Speech failed to start`);
        setIsSpeaking(false);
        currentSpeechRef.current = null;
        if (options.onError) {
          options.onError();
        }
      }

      return success;
    } catch (error) {
      console.error(`[SIMPLE-SPEECH-${speechId}] Exception:`, error);
      setIsSpeaking(false);
      currentSpeechRef.current = null;
      if (options.onError) {
        options.onError();
      }
      return false;
    }
  }, [isSpeaking]);

  const stop = useCallback(() => {
    console.log('[SIMPLE-SPEECH] Stopping speech');
    simpleSpeechController.stop();
    setIsSpeaking(false);
    currentSpeechRef.current = null;
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    currentText: currentSpeechRef.current
  };
};
