
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { speak, stopSpeaking, isSpeechSynthesisSupported, getVoiceByRegion } from '@/utils/speechUtils';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const { toast } = useToast();
  const speakingRef = useRef(false);
  const speechRequestIdRef = useRef(0);
  const currentVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Check if speech synthesis is supported
  useEffect(() => {
    const supported = isSpeechSynthesisSupported();
    if (!supported) {
      toast({
        title: "Speech Not Supported",
        description: "Your browser doesn't support speech synthesis.",
        variant: "destructive"
      });
      return;
    }

    // Initialize voice loading
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('Voices loaded successfully:', voices.length);
        setIsVoicesLoaded(true);
        // Initialize current voice
        currentVoiceRef.current = getVoiceByRegion(voiceRegion);
        return true;
      }
      return false;
    };

    // First attempt to load voices
    const voicesLoaded = loadVoices();
    
    if (!voicesLoaded) {
      // Set up event listener for Chrome
      if ('onvoiceschanged' in window.speechSynthesis) {
        const voicesChangedHandler = () => {
          const success = loadVoices();
          if (success) {
            window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          }
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
        
        // Clean up
        return () => {
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        };
      } else {
        // For browsers without the event, try loading after a delay
        const timerId = setTimeout(() => {
          loadVoices();
          // If still no voices, make one final attempt
          if (!isVoicesLoaded) {
            setTimeout(loadVoices, 1000);
          }
        }, 500);
        
        return () => clearTimeout(timerId);
      }
    }
  }, [toast]);

  // Update voice when region changes
  useEffect(() => {
    if (isVoicesLoaded) {
      currentVoiceRef.current = getVoiceByRegion(voiceRegion);
      console.log(`Voice region changed to ${voiceRegion}`);
      
      // Try to speak a test phrase with the new voice
      if (!isMuted) {
        const testText = voiceRegion === 'US' ? 'American accent selected' : 'British accent selected';
        speak(testText)
          .then(() => console.log('Voice region change announced'))
          .catch(err => console.warn('Could not announce voice region change:', err));
      }
    }
  }, [voiceRegion, isVoicesLoaded, isMuted]);

  // Test the speech system once voices are loaded
  useEffect(() => {
    if (isVoicesLoaded && !isMuted) {
      // Small delay to ensure everything is ready
      const timerId = setTimeout(() => {
        // Simple test speech
        speak("Speech system ready")
          .then(() => {
            console.log("Test speech successful");
          })
          .catch(err => {
            console.warn("Test speech failed:", err);
            // Don't show an error for the test speech
          });
      }, 500);
      
      return () => clearTimeout(timerId);
    }
  }, [isVoicesLoaded, isMuted]);

  // Speak function with full promise handling to ensure completion
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (isMuted || !text || speakingRef.current) {
      console.log(isMuted ? 'Speech is muted' : speakingRef.current ? 'Already speaking' : 'No text provided');
      return;
    }

    // Generate a unique ID for this speech request
    const requestId = ++speechRequestIdRef.current;
    
    speakingRef.current = true;
    console.log('Attempting to speak:', text.substring(0, 30) + '...');
    
    try {
      // This will now properly wait until speech is complete
      await speak(text);
      
      // Only mark as completed if this is still the current request
      if (requestId === speechRequestIdRef.current) {
        console.log('Speech completed successfully');
      }
    } catch (error) {
      console.error('Failed to speak text:', error);
      // Only show error if it's not a cancel or interrupted error
      if (error instanceof Error && 
          !error.message.includes('canceled') && 
          !error.message.includes('interrupted')) {
        toast({
          title: "Speech Error",
          description: "Could not speak the text. Please check your audio settings and ensure your device has working speakers.",
          variant: "destructive"
        });
      }
    } finally {
      // Always mark as not speaking when done
      if (requestId === speechRequestIdRef.current) {
        speakingRef.current = false;
      }
    }
  }, [isMuted, toast]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      if (newState) {
        stopSpeaking();
      }
      return newState;
    });
  }, []);

  const handleChangeVoice = useCallback(() => {
    setVoiceRegion(prev => (prev === 'US' ? 'UK' : 'US'));
    stopSpeaking();
  }, []);

  return {
    isMuted,
    speakText,
    handleToggleMute,
    voiceRegion,
    handleChangeVoice,
    isVoicesLoaded
  };
};
