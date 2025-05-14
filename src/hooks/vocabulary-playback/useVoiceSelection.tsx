
import { useState, useEffect } from 'react';

export type VoiceOption = {
  label: string;
  region: 'US' | 'UK';
  gender: 'male' | 'female';
  voice: SpeechSynthesisVoice | null;
};

const DEFAULT_VOICE_OPTION: VoiceOption = {
  label: "US",
  region: "US" as const,
  gender: "female" as const,
  voice: null
};

export const useVoiceSelection = () => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(DEFAULT_VOICE_OPTION);
  
  // Load available voices when the component mounts
  useEffect(() => {
    // Try to load saved preferences for voice
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { voiceRegion } = JSON.parse(savedSettings);
        
        // We'll set the selected voice after loading the voice list
        if (voiceRegion) {
          console.log(`Found saved voice preference: ${voiceRegion}`);
        }
      }
    } catch (error) {
      console.error('Error loading saved voice settings:', error);
    }
    
    // Initialize voice loading
    const loadVoices = () => {
      const synth = window.speechSynthesis;
      const availableVoices = synth.getVoices();
      
      // Ensure voices are properly loaded by logging them
      console.log(`Loading ${availableVoices.length} voices`);
      if (availableVoices.length > 0) {
        availableVoices.forEach((v, i) => {
          if (i < 10) { // Log just the first 10 to avoid console spam
            console.log(`Voice ${i+1}: ${v.name} (${v.lang})`);
          }
        });
      }
      
      if (availableVoices.length) {
        // Find specific voices for better quality
        const findVoiceByPattern = (
          pattern: RegExp, 
          langPrefix: string
        ): SpeechSynthesisVoice | null => {
          // First try by name pattern
          const matchByName = availableVoices.find(v => pattern.test(v.name));
          if (matchByName) return matchByName;
          
          // Then try by language
          const matchByLang = availableVoices.find(v => v.lang.startsWith(langPrefix));
          if (matchByLang) return matchByLang;
          
          // Fallback to any English voice
          return availableVoices.find(v => v.lang.startsWith('en')) || null;
        };
        
        // Find US female voice
        const usVoice = findVoiceByPattern(
          /US English Female|en-US.*female|Samantha|Google US|Siri/i, 
          'en-US'
        );
        
        // Find UK female voice
        const ukVoice = findVoiceByPattern(
          /UK English Female|en-GB.*female|British|Catherine|Google UK/i, 
          'en-GB'
        );
        
        const voiceOptions: VoiceOption[] = [
          {
            label: "US",
            region: "US" as const,
            gender: "female" as const,
            voice: usVoice
          },
          {
            label: "UK",
            region: "UK" as const,
            gender: "female" as const,
            voice: ukVoice
          }
        ];
        
        console.log('Voice options created:');
        console.log(`US voice: ${voiceOptions[0].voice?.name || 'not found'}`);
        console.log(`UK voice: ${voiceOptions[1].voice?.name || 'not found'}`);
        
        setVoices(voiceOptions);
        
        // Try to restore saved voice preference
        try {
          const savedSettings = localStorage.getItem('vocabularySettings');
          if (savedSettings) {
            const { voiceRegion } = JSON.parse(savedSettings);
            const savedVoice = voiceOptions.find(v => v.region === voiceRegion);
            if (savedVoice) {
              console.log(`Restoring saved voice: ${voiceRegion}`);
              setSelectedVoice(savedVoice);
            }
          }
        } catch (error) {
          console.error('Error restoring voice preference:', error);
        }
      }
    };

    // Try to load voices immediately
    loadVoices();
    
    // For browsers that load voices asynchronously
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      // Fallback for browsers without onvoiceschanged event
      setTimeout(loadVoices, 500);
    }
    
    return () => {
      // Clean up
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);
  
  // Function to change voice selection
  const changeVoice = (voiceRegion: 'US' | 'UK') => {
    const selectedOption = voices.find(v => v.region === voiceRegion);
    if (selectedOption) {
      console.log(`Changing voice to ${voiceRegion}: ${selectedOption.voice?.name || 'default'}`);
      setSelectedVoice(selectedOption);
      
      // Save the preference
      try {
        const savedSettings = localStorage.getItem('vocabularySettings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        localStorage.setItem('vocabularySettings', JSON.stringify({
          ...settings,
          voiceRegion
        }));
      } catch (error) {
        console.error('Error saving voice preference:', error);
      }
    }
  };
  
  return {
    voices,
    selectedVoice,
    changeVoice
  };
};
