
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { toast } = useToast();
  
  // Load voices when component mounts
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: "Speech Synthesis Unavailable",
        description: "Your browser doesn't support speech synthesis.",
        variant: "destructive"
      });
      return;
    }
    
    // Initial load of voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        console.log("Voices loaded successfully:", availableVoices.length);
      }
    };
    
    loadVoices(); // Try to load immediately (works in some browsers)
    
    // This event fires when voices are ready in Chrome
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
    
    return () => {
      // Cancel any ongoing speech when component unmounts
      window.speechSynthesis.cancel();
    };
  }, [toast]);

  // Function to find the best voice based on region preference
  const findBestVoice = useCallback(() => {
    if (voices.length === 0) return null;
    
    // Filter for English voices
    const englishVoices = voices.filter(voice => 
      voice.lang.includes('en') || voice.lang.includes('EN')
    );
    
    if (englishVoices.length === 0) return voices[0]; // Fallback to any voice
    
    // Find region-specific voice
    const preferredVoices = englishVoices.filter(voice => 
      voiceRegion === 'US' 
        ? voice.lang.includes('US') 
        : (voice.lang.includes('GB') || voice.lang.includes('UK'))
    );
    
    // Return a preferred voice or fallback to any English voice
    return preferredVoices.length > 0 ? preferredVoices[0] : englishVoices[0];
  }, [voices, voiceRegion]);

  const speakText = useCallback((text: string): Promise<void> => {
    if (isMuted || !text || !('speechSynthesis' in window)) {
      return Promise.resolve();
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice
      const selectedVoice = findBestVoice();
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log("Using voice:", selectedVoice.name, selectedVoice.lang);
      } else {
        console.warn("No suitable voice found");
      }
      
      // Set speech parameters
      utterance.rate = 0.9;  // Slightly slower than default
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Handle speech events
      utterance.onend = () => {
        console.log("Speech completed successfully");
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        
        // Always resolve to prevent breaking chains
        resolve();
        
        // Show error toast (occasionally to prevent spam)
        if (Math.random() < 0.3) {
          toast({
            title: "Speech Error",
            description: "There was an issue with speech playback.",
            variant: "destructive"
          });
        }
      };
      
      // Debugging
      console.log("Starting speech:", text.substring(0, 50) + "...");
      
      // Speak the text
      window.speechSynthesis.speak(utterance);
    });
  }, [isMuted, findBestVoice, toast]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      console.log("Mute toggled:", newValue);
      if (newValue) {
        window.speechSynthesis.cancel();
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
    handleChangeVoice
  };
};
