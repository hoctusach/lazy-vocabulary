
import { useState, useEffect, useCallback } from 'react';
import { VoiceSelection } from '../useVoiceSelection';

/**
 * Hook for managing voice selection and finding appropriate voices
 */
export const useVoiceManagement = () => {
  // Define voice options with consistent structure
  const allVoiceOptions: VoiceSelection[] = [
    { label: "US-F", region: "US", gender: "female", index: 0 },
    { label: "US-M", region: "US", gender: "male", index: 1 },
    { label: "UK-F", region: "UK", gender: "female", index: 2 },
    { label: "UK-M", region: "UK", gender: "male", index: 3 }
  ];
  
  const [voiceIndex, setVoiceIndex] = useState(0);
  
  // Create voice options array for UI - compatibility format
  const voices = [
    { label: "US", region: "US" as const, gender: "female" as const, voice: null },
    { label: "UK", region: "UK" as const, gender: "female" as const, voice: null }
  ];
  
  // Load initial voice settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { voiceIndex: savedVoiceIndex } = JSON.parse(savedSettings);
        
        // Set voice index if valid
        if (typeof savedVoiceIndex === 'number' && savedVoiceIndex >= 0 && 
            savedVoiceIndex < allVoiceOptions.length) {
          setVoiceIndex(savedVoiceIndex);
        }
      }
    } catch (error) {
      console.error('Error loading saved voice settings:', error);
    }
  }, []);
  
  // Function to find the appropriate voice with logging
  const findVoice = useCallback((region: 'US' | 'UK'): SpeechSynthesisVoice | null => {
    // Always get fresh voices
    const voices = window.speechSynthesis.getVoices();
    console.log(`Finding ${region} voice among ${voices.length} voices`);
    
    if (voices.length === 0) {
      console.warn('No voices available');
      return null;
    }
    
    // Log first few voices to help with debugging
    voices.slice(0, 5).forEach((v, i) => {
      console.log(`Voice ${i}: ${v.name} (${v.lang})`);
    });
    
    // Try to find a voice that matches the region
    let voice: SpeechSynthesisVoice | null = null;
    
    if (region === 'UK') {
      console.log('Looking for UK voice');
      // Try to find UK female voice by name patterns
      voice = voices.find(v => 
        /UK English|en-GB|Google UK|British/i.test(v.name)
      );
      
      // If no specific voice found, try any en-GB voice
      if (!voice) {
        voice = voices.find(v => v.lang === 'en-GB');
      }
    } else {
      console.log('Looking for US voice');
      // Try to find US female voice by name patterns
      voice = voices.find(v => 
        /US English|en-US|Google US|Samantha/i.test(v.name)
      );
      
      // If no specific voice found, try any en-US voice
      if (!voice) {
        voice = voices.find(v => v.lang === 'en-US');
      }
    }
    
    // Fallback to any English voice
    if (!voice) {
      console.log('Falling back to any English voice');
      voice = voices.find(v => v.lang.startsWith('en'));
    }
    
    // Last resort - just use the first voice
    if (!voice && voices.length > 0) {
      console.log('Using first available voice as last resort');
      voice = voices[0];
    }
    
    if (voice) {
      console.log(`Selected ${region} voice:`, voice.name, voice.lang);
    } else {
      console.warn('No suitable voice found');
    }
    
    return voice;
  }, []);
  
  // Function to cycle through voices
  const cycleVoice = useCallback(() => {
    setVoiceIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % allVoiceOptions.length;
      console.log(`Cycling voice from ${allVoiceOptions[prevIndex].label} to ${allVoiceOptions[nextIndex].label}`);
      
      // Save to localStorage
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
      
      return nextIndex;
    });
  }, [allVoiceOptions]);
  
  // Get the current selected voice
  const selectedVoice = allVoiceOptions[voiceIndex];
  
  return {
    voices,
    voiceIndex,
    selectedVoice,
    allVoiceOptions,
    findVoice,
    cycleVoice
  };
};
