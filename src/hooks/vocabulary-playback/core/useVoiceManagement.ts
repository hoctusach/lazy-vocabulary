
import { useState, useEffect, useCallback } from 'react';
import { VoiceSelection } from '../useVoiceSelection';
import { toast } from 'sonner';

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
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
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
    
    // Also try to preload voices
    const loadVoicesAndNotify = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        console.log(`Voices loaded: found ${availableVoices.length} voices`);
        setVoicesLoaded(true);
        
        // Check if we have English voices
        const hasEnglishVoices = availableVoices.some(v => v.lang.startsWith('en'));
        if (!hasEnglishVoices) {
          toast.warning("No English voices found. Speech may not work correctly.");
        }
      }
    };
    
    // Try to load voices right away
    loadVoicesAndNotify();
    
    // Set up event listener for async voice loading
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoicesAndNotify);
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoicesAndNotify);
      };
    }
  }, [allVoiceOptions]);
  
  // Function to find the appropriate voice
  const findVoice = useCallback((region: 'US' | 'UK'): SpeechSynthesisVoice | null => {
    const currentOption = allVoiceOptions[voiceIndex];
    const gender = currentOption.gender;
    const targetRegion = currentOption.region;
    console.log(`Looking for ${targetRegion} ${gender} voice`);
    
    // Always get fresh voices
    const allVoices = window.speechSynthesis.getVoices();
    console.log(`Finding voice among ${allVoices.length} voices`);
    
    if (allVoices.length === 0) {
      console.warn('No voices available');
      return null;
    }
    
    // Log first few voices to help with debugging
    allVoices.slice(0, 5).forEach((v, i) => {
      console.log(`Voice ${i}: ${v.name} (${v.lang})`);
    });
    
    const genderPattern = gender === 'female' ? /female|woman|girl|f$/i : /male|man|boy|m$/i;
    
    // Try multiple strategies to find the best voice
    let voice: SpeechSynthesisVoice | null = null;
    
    // Strategy 1: Find exact language match with gender
    if (region === 'UK') {
      voice = allVoices.find(v => 
        v.lang === 'en-GB' && genderPattern.test(v.name)
      );
    } else {
      voice = allVoices.find(v => 
        v.lang === 'en-US' && genderPattern.test(v.name)
      );
    }
    
    // Strategy 2: Exact language match without gender check
    if (!voice) {
      voice = allVoices.find(v => 
        v.lang === (region === 'UK' ? 'en-GB' : 'en-US')
      );
    }
    
    // Strategy 3: Any English voice with gender match
    if (!voice) {
      voice = allVoices.find(v => 
        v.lang.startsWith('en') && genderPattern.test(v.name)
      );
    }
    
    // Strategy 4: Any English voice
    if (!voice) {
      voice = allVoices.find(v => v.lang.startsWith('en'));
    }
    
    // Strategy 5: First voice in the list
    if (!voice && allVoices.length > 0) {
      console.log('No suitable English voice found, using first available voice');
      voice = allVoices[0];
    }
    
    if (voice) {
      console.log(`Selected ${region} voice:`, voice.name, voice.lang);
    } else {
      console.warn('No suitable voice found');
    }
    
    return voice;
  }, [voiceIndex, allVoiceOptions]);
  
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
      
      // Notify the user
      toast.success(`Voice changed to ${allVoiceOptions[nextIndex].label}`);
      
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
    cycleVoice,
    voicesLoaded
  };
};
