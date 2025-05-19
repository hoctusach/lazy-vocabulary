
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
    
    // Try to load voices immediately
    loadVoicesAndNotify();
    
    // Set up event listener for async voice loading
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoicesAndNotify);
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoicesAndNotify);
      };
    }
  }, [allVoiceOptions]);
  
  // Function to find the appropriate voice with improved logging
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
    
    // Get gender preference from current voice index
    const gender = allVoiceOptions[voiceIndex].gender;
    const genderPattern = gender === 'female' ? /female|woman|girl|f$/i : /male|man|boy|m$/i;
    
    // Try to find a voice that matches the region and gender
    let voice: SpeechSynthesisVoice | null = null;
    
    // First priority: exact language match with gender preference
    if (region === 'UK') {
      console.log(`Looking for UK ${gender} voice`);
      voice = voices.find(v => 
        v.lang === 'en-GB' && genderPattern.test(v.name)
      );
    } else {
      console.log(`Looking for US ${gender} voice`);
      voice = voices.find(v => 
        v.lang === 'en-US' && genderPattern.test(v.name)
      );
    }
    
    // Second priority: exact language match without gender
    if (!voice) {
      voice = voices.find(v => 
        v.lang === (region === 'UK' ? 'en-GB' : 'en-US')
      );
    }
    
    // Third priority: name-based match
    if (!voice) {
      const regionPattern = region === 'UK' 
        ? /uk|british|england|gb/i 
        : /us|american|united states/i;
      
      voice = voices.find(v => 
        v.lang.startsWith('en') && 
        regionPattern.test(v.name)
      );
    }
    
    // Fourth priority: any English voice
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('en'));
    }
    
    // Last resort: first voice
    if (!voice && voices.length > 0) {
      voice = voices[0];
    }
    
    if (voice) {
      console.log(`Selected ${region} ${gender} voice:`, voice.name, voice.lang);
    } else {
      console.warn('No suitable voice found');
    }
    
    return voice;
  }, [allVoiceOptions, voiceIndex]);
  
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
