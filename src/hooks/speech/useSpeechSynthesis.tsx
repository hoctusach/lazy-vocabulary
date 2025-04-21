import { useEffect, useCallback, useRef } from 'react';
import { speak, stopSpeaking } from '@/utils/speech';
import { useVoiceSettings } from './useVoiceSettings';
import { useVoiceLoading } from './useVoiceLoading';

export const useSpeechSynthesis = () => {
  const { isMuted, voiceRegion, setIsMuted, setVoiceRegion } = useVoiceSettings();
  const {
    isVoicesLoaded,
    currentVoiceRef,
    lastVoiceRegionRef,
    pendingSpeechRef
  } = useVoiceLoading(voiceRegion);

  const speakingRef = useRef(false);
  const speechRequestIdRef = useRef(0);
  const currentTextRef = useRef<string | null>(null);

  // ▶️ When voices finish loading, replay any queued speech
  useEffect(() => {
    if (isVoicesLoaded && pendingSpeechRef.current) {
      const { text, forceSpeak } = pendingSpeechRef.current;
      pendingSpeechRef.current = null;
      _speakText(text, forceSpeak);
    }
  }, [isVoicesLoaded]);

  // Internal function that does the real speak + queuing logic
  const _speakText = useCallback(
    async (text: string, forceSpeak: boolean): Promise<void> => {
      currentTextRef.current = text;

      // If voices not ready, queue for later
      if (!isVoicesLoaded) {
        pendingSpeechRef.current = { text, forceSpeak };
        return;
      }

      // Mute or empty text => no-op
      if (isMuted || !text) {
        return;
      }

      // If already speaking, cancel and wait a moment
      if (speakingRef.current) {
        stopSpeaking();
        await new Promise((r) => setTimeout(r, 100));
      }

      const requestId = ++speechRequestIdRef.current;
      speakingRef.current = true;

      try {
        await speak(text, voiceRegion);
      } catch (error) {
        console.error('Speech error:', error);
      } finally {
        // Only clear speaking flag if this is the last request
        if (requestId === speechRequestIdRef.current) {
          speakingRef.current = false;
        }
      }
    },
    [isMuted, voiceRegion, isVoicesLoaded]
  );

  // Public speakText matches original signature
  const speakText = useCallback((text: string) => _speakText(text, true), [_speakText]);

  // Toggle mute/unmute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      stopSpeaking();
      return next;
    });
  }, [setIsMuted]);

  // Switch voice region
  const handleChangeVoice = useCallback(() => {
    setVoiceRegion((prev) => {
      const next = prev === 'US' ? 'UK' : 'US';
      stopSpeaking();
      return next;
    });
  }, [setVoiceRegion]);

  // Expose current text (for sync checks, if needed)
  const getCurrentText = useCallback(() => currentTextRef.current, []);

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    speakingRef,
    getCurrentText
  };
};
