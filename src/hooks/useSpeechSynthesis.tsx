
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { speak, stopSpeaking } from '@/utils/speechUtils';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const { toast } = useToast();

  const speakText = useCallback(async (text: string): Promise<void> => {
    if (isMuted || !text) {
      return;
    }

    try {
      await speak(text);
    } catch (error) {
      console.error('Speech error:', error);
      toast({
        title: "Speech Error",
        description: "Could not speak the text. Please check if your browser supports speech synthesis.",
        variant: "destructive"
      });
    }
  }, [isMuted, toast]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) {
        stopSpeaking();
      }
      return !prev;
    });
  }, []);

  return {
    isMuted,
    speakText,
    handleToggleMute,
    voiceRegion: 'US' as const, // Simplified to always use US voices
    handleChangeVoice: () => {}, // Simplified to do nothing
    isVoicesLoaded: true // Simplified to always be true
  };
};
