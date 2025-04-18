
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { elevenLabsSpeechService } from '@/services/elevenLabsSpeechService';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const apiKeyPromptShown = useRef(false);
  const { toast } = useToast();
  
  // Check local storage for API key on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('elevenLabsApiKey');
    
    if (savedApiKey) {
      console.log("Found saved ElevenLabs API key");
      elevenLabsSpeechService.configure({
        apiKey: savedApiKey,
        voiceId: elevenLabsSpeechService.getRegionalVoice(voiceRegion)
      });
      setApiKeySet(true);
      setIsVoicesLoaded(true);
    } else if (!apiKeyPromptShown.current) {
      // Ask for API key only once
      apiKeyPromptShown.current = true;
      setTimeout(() => {
        const userApiKey = window.prompt(
          "Please enter your ElevenLabs API key for premium text-to-speech. Get a free key at https://elevenlabs.io"
        );
        
        if (userApiKey) {
          localStorage.setItem('elevenLabsApiKey', userApiKey);
          elevenLabsSpeechService.configure({
            apiKey: userApiKey,
            voiceId: elevenLabsSpeechService.getRegionalVoice(voiceRegion)
          });
          setApiKeySet(true);
          setIsVoicesLoaded(true);
          
          toast({
            title: "ElevenLabs Voice Set Up",
            description: `Premium voice enabled with ${voiceRegion} accent.`,
          });
        } else {
          toast({
            title: "Voice Setup Incomplete",
            description: "ElevenLabs API key not provided. Speech will not work.",
            variant: "destructive"
          });
        }
      }, 1000);
    }
    
    return () => {
      elevenLabsSpeechService.cancel();
    };
  }, [toast, voiceRegion]);

  // Update voice when region changes
  useEffect(() => {
    if (apiKeySet) {
      const voiceId = elevenLabsSpeechService.getRegionalVoice(voiceRegion);
      elevenLabsSpeechService.setVoice(voiceId);
      console.log(`Voice region changed to: ${voiceRegion}, voice ID: ${voiceId}`);
    }
  }, [voiceRegion, apiKeySet]);

  const speakText = useCallback((text: string): Promise<void> => {
    if (isMuted || !text || !apiKeySet) {
      return Promise.resolve();
    }
    
    console.log(`Speaking with ElevenLabs: ${text.substring(0, 50)}...`);
    
    return elevenLabsSpeechService.speak(text)
      .catch(error => {
        console.error("ElevenLabs speech error:", error);
        toast({
          title: "Speech Error",
          description: "There was an issue with the text-to-speech service.",
          variant: "destructive"
        });
        
        // Re-throw to allow caller to handle
        throw error;
      });
  }, [isMuted, apiKeySet, toast]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      console.log("Mute toggled:", newValue);
      if (newValue) {
        elevenLabsSpeechService.cancel();
      }
      return newValue;
    });
  }, []);

  const handleChangeVoice = useCallback(() => {
    setVoiceRegion(prev => {
      const newValue = prev === 'US' ? 'UK' : 'US';
      console.log("Voice region changed to:", newValue);
      return newValue;
    });
  }, []);

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded
  };
};
