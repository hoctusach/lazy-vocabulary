
import { useState, useCallback, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useToast } from '@/hooks/use-toast';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const { toast } = useToast();
  
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Force loading voices
      window.speechSynthesis.getVoices();
      
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    } else {
      toast({
        title: "Speech Synthesis Unavailable",
        description: "Your browser doesn't support speech synthesis.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const speakText = useCallback((text: string) => {
    if (isMuted || !text) return Promise.resolve();
    
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      let voices = window.speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        // Some browsers need a small delay to load voices
        setTimeout(() => {
          voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            // Try speaking again if voices are now available
            speakText(text);
          } else {
            console.error("No voices available after retry");
            toast({
              title: "Speech Issue",
              description: "Could not find voice options. Try refreshing the page.",
              variant: "destructive"
            });
          }
        }, 200);
        return Promise.resolve();
      }
      
      const englishVoices = voices.filter(voice => voice.lang.includes('en'));
      console.log("Available English voices:", englishVoices.length);
      
      const regionVoices = englishVoices.filter(voice => 
        voiceRegion === 'US' 
          ? voice.lang.includes('US') 
          : voice.lang.includes('GB') || voice.lang.includes('UK')
      );
      
      console.log(`Available ${voiceRegion} voices:`, regionVoices.length);
      
      if (regionVoices.length > 0) {
        utterance.voice = regionVoices[0];
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1.0;
      
      // Log which voice was selected
      console.log("Selected voice:", utterance.voice?.name);
      
      // Create a promise that resolves when speech ends
      const speechPromise = new Promise<void>((resolve, reject) => {
        utterance.onend = () => {
          console.log("Speech completed successfully");
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error("Speech synthesis error event:", event);
          
          // Don't reject the promise, just log the error and resolve
          // This prevents errors from breaking the chain
          resolve();
          
          // Try to inform the user but don't show too many errors
          if (Math.random() < 0.3) { // Only show error 30% of the time to avoid spamming
            toast({
              title: "Voice Issue",
              description: "There was a problem with speech playback. You may need to refresh.",
              variant: "destructive"
            });
          }
        };
      });
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
      
      return speechPromise;
    } catch (error) {
      console.error('Speech synthesis error:', error);
      toast({
        title: "Speech Error",
        description: "There was an error with the speech synthesis.",
        variant: "destructive"
      });
      return Promise.resolve();
    }
  }, [isMuted, voiceRegion, toast]);

  const handleToggleMute = () => {
    setIsMuted(prev => {
      const newValue = !prev;
      console.log("Mute toggled:", newValue);
      if (newValue) {
        window.speechSynthesis.cancel();
      }
      return newValue;
    });
  };

  const handleChangeVoice = () => {
    setVoiceRegion(prev => {
      const newValue = prev === 'US' ? 'UK' : 'US';
      console.log("Voice region changed to:", newValue);
      window.speechSynthesis.cancel();
      return newValue;
    });
  };

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice
  };
};
