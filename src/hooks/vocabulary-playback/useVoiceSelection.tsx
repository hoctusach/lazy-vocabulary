
import { useState, useEffect } from 'react';

export type VoiceOption = {
  label: string;
  region: 'US' | 'UK';
  gender: 'male' | 'female';
  voice: SpeechSynthesisVoice | null;
};

// Define voice types with consistent structure
export interface VoiceSelection {
  label: string;
  region: 'US' | 'UK';
  gender: 'male' | 'female';
  index: number;
}

const VOICE_OPTIONS: VoiceSelection[] = [
  { label: "US-F", region: "US", gender: "female", index: 0 },
  { label: "US-M", region: "US", gender: "male", index: 1 },
  { label: "UK-F", region: "UK", gender: "female", index: 2 },
  { label: "UK-M", region: "UK", gender: "male", index: 3 },
];

const DEFAULT_VOICE_OPTION: VoiceSelection = VOICE_OPTIONS[0];

export const useVoiceSelection = () => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceSelection>(DEFAULT_VOICE_OPTION);
  const [voiceIndex, setVoiceIndex] = useState<number>(0);
  
  // Load available voices when the component mounts
  useEffect(() => {
    // Try to load saved preferences for voice
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { voiceIndex } = JSON.parse(savedSettings);
        
        if (typeof voiceIndex === 'number' && voiceIndex >= 0 && voiceIndex < VOICE_OPTIONS.length) {
          setVoiceIndex(voiceIndex);
          setSelectedVoice(VOICE_OPTIONS[voiceIndex]);
          console.log(`Found saved voice preference: ${VOICE_OPTIONS[voiceIndex].label}`);
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
        // Find voices for all our options
        const findVoiceByPattern = (
          pattern: RegExp, 
          langPrefix: string,
          gender: string
        ): SpeechSynthesisVoice | null => {
          // First try by name pattern with gender
          const genderPattern = gender === 'female' ? /female|woman|girl|f$/i : /male|man|boy|m$/i;
          const matchByNameAndGender = availableVoices.find(v => 
            pattern.test(v.name) && genderPattern.test(v.name)
          );
          if (matchByNameAndGender) return matchByNameAndGender;
          
          // Then try by name pattern only
          const matchByName = availableVoices.find(v => pattern.test(v.name));
          if (matchByName) return matchByName;
          
          // Then try by language with gender hint
          const matchByLangAndGender = availableVoices.find(v => 
            v.lang.startsWith(langPrefix) && genderPattern.test(v.name)
          );
          if (matchByLangAndGender) return matchByLangAndGender;
          
          // Then try by language only
          const matchByLang = availableVoices.find(v => v.lang.startsWith(langPrefix));
          if (matchByLang) return matchByLang;
          
          // Fallback to any English voice
          return availableVoices.find(v => v.lang.startsWith('en')) || null;
        };
        
        // Find US female voice
        const usFemaleVoice = findVoiceByPattern(
          /US English Female|en-US.*female|Samantha|Google US.*female|US-F/i, 
          'en-US',
          'female'
        );
        
        // Find US male voice
        const usMaleVoice = findVoiceByPattern(
          /US English Male|en-US.*male|Daniel|Google US.*male|US-M/i, 
          'en-US',
          'male'
        );
        
        // Find UK female voice
        const ukFemaleVoice = findVoiceByPattern(
          /UK English Female|en-GB.*female|Catherine|Google UK.*female|UK-F/i, 
          'en-GB',
          'female'
        );
        
        // Find UK male voice
        const ukMaleVoice = findVoiceByPattern(
          /UK English Male|en-GB.*male|Charles|Google UK.*male|UK-M/i, 
          'en-GB',
          'male'
        );
        
        const voiceOptions: VoiceOption[] = [
          {
            label: "US-F",
            region: "US" as const,
            gender: "female" as const,
            voice: usFemaleVoice
          },
          {
            label: "US-M",
            region: "US" as const,
            gender: "male" as const,
            voice: usMaleVoice
          },
          {
            label: "UK-F",
            region: "UK" as const,
            gender: "female" as const,
            voice: ukFemaleVoice
          },
          {
            label: "UK-M",
            region: "UK" as const,
            gender: "male" as const,
            voice: ukMaleVoice
          }
        ];
        
        console.log('Voice options created:');
        console.log(`US-F voice: ${voiceOptions[0].voice?.name || 'not found'}`);
        console.log(`US-M voice: ${voiceOptions[1].voice?.name || 'not found'}`);
        console.log(`UK-F voice: ${voiceOptions[2].voice?.name || 'not found'}`);
        console.log(`UK-M voice: ${voiceOptions[3].voice?.name || 'not found'}`);
        
        setVoices(voiceOptions);
        
        // Try to restore saved voice preference
        try {
          const savedSettings = localStorage.getItem('vocabularySettings');
          if (savedSettings) {
            const { voiceIndex } = JSON.parse(savedSettings);
            if (typeof voiceIndex === 'number' && voiceIndex >= 0 && voiceIndex < VOICE_OPTIONS.length) {
              console.log(`Restoring saved voice: ${VOICE_OPTIONS[voiceIndex].label}`);
              setVoiceIndex(voiceIndex);
              setSelectedVoice(VOICE_OPTIONS[voiceIndex]);
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
  
  // Function to change voice selection - now cycles through all 4 voices
  const cycleVoice = () => {
    const nextIndex = (voiceIndex + 1) % VOICE_OPTIONS.length;
    const nextVoice = VOICE_OPTIONS[nextIndex];
    
    console.log(`Cycling voice from ${selectedVoice.label} to ${nextVoice.label}`);
    setVoiceIndex(nextIndex);
    setSelectedVoice(nextVoice);
    
    // Save the preference
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      localStorage.setItem('vocabularySettings', JSON.stringify({
        ...settings,
        voiceIndex: nextIndex
      }));
    } catch (error) {
      console.error('Error saving voice preference:', error);
    }
  };
  
  return {
    voices,
    selectedVoice,
    cycleVoice,
    voiceIndex,
    allVoiceOptions: VOICE_OPTIONS
  };
};
