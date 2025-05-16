
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { toast } from "sonner";

export const useVocabularyPlayback = (wordList: VocabularyWord[]) => {
  // State for managing playback
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'US' | 'UK'>('US');
  
  // Important refs for tracking state
  const userInteractionRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakingRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  const maxRetries = 3;
  
  // Get the current word based on the index
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // Load initial settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { muted: savedMuted, voiceRegion } = JSON.parse(savedSettings);
        setMuted(!!savedMuted);
        if (voiceRegion === 'UK' || voiceRegion === 'US') {
          setSelectedVoice(voiceRegion);
        }
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  }, []);
  
  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      const settings = {
        muted,
        voiceRegion: selectedVoice
      };
      localStorage.setItem('vocabularySettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [muted, selectedVoice]);
  
  // Ensure speech synthesis is canceled when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Function to cancel any current speech and reset state
  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      console.log('Cancelling any ongoing speech');
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      
      // Clear utterance reference to avoid memory leaks
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current = null;
      }
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
  
  // Function to advance to next word with full cleanup
  const goToNextWord = useCallback(() => {
    if (wordList.length === 0) return;
    
    // Cancel any ongoing speech
    cancelSpeech();
    
    // Move to next word with a circular index
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      console.log(`Moving to word ${nextIndex}: ${wordList[nextIndex]?.word || 'unknown'}`);
      return nextIndex;
    });
    
    // Reset retry attempts for the new word
    retryAttemptsRef.current = 0;
  }, [wordList, cancelSpeech]);

  // Core function to play the current word
  const playCurrentWord = useCallback(() => {
    // Mark that we've had user interaction
    userInteractionRef.current = true;
    
    // Basic checks
    if (!currentWord) {
      console.log('No current word to play');
      return;
    }
    
    if (muted) {
      console.log('Speech is muted');
      return;
    }
    
    if (paused) {
      console.log('Playback is paused');
      return;
    }
    
    console.log(`Attempting to play word: ${currentWord.word}`);
    
    // CRITICAL: Cancel any ongoing speech to prevent queuing
    cancelSpeech();
    
    // Ensure speech synthesis is available
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      toast.error("Speech synthesis isn't supported in your browser");
      return;
    }
    
    // Small delay to ensure cancellation completes
    setTimeout(() => {
      try {
        // Reload voices (critical step)
        const voices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded: ${voices.length} voices available`);
        
        // Create a fresh utterance for this word
        const utterance = new SpeechSynthesisUtterance();
        utteranceRef.current = utterance;
        
        // Set up the text with proper structure
        const wordText = currentWord.word;
        const meaningText = currentWord.meaning || '';
        const exampleText = currentWord.example || '';
        
        utterance.text = `${wordText}. ${meaningText}. ${exampleText}`.trim();
        
        // Set language based on selected voice
        utterance.lang = selectedVoice === 'UK' ? 'en-GB' : 'en-US';
        
        // Find and apply the voice
        const voice = findVoice(selectedVoice);
        if (voice) {
          utterance.voice = voice;
        }
        
        // Set speech parameters for better clarity
        utterance.rate = 0.95; // Slightly slower
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Set up event handlers BEFORE calling speak()
        utterance.onstart = () => {
          console.log(`Speech started for: ${currentWord.word}`);
          speakingRef.current = true;
        };
        
        utterance.onend = () => {
          console.log(`Speech ended successfully for: ${currentWord.word}`);
          speakingRef.current = false;
          
          // Only auto-advance if not paused and not muted
          if (!paused && !muted) {
            console.log('Auto-advancing to next word');
            goToNextWord();
          }
        };
        
        utterance.onerror = (event) => {
          console.error(`Speech synthesis error:`, event);
          speakingRef.current = false;
          
          // Increment retry counter
          retryAttemptsRef.current++;
          
          if (retryAttemptsRef.current <= maxRetries) {
            console.log(`Retry attempt ${retryAttemptsRef.current}/${maxRetries}`);
            
            // Wait briefly then retry
            setTimeout(() => {
              if (!paused && !muted) {
                console.log('Retrying speech after error');
                playCurrentWord();
              }
            }, 300);
          } else {
            console.log(`Max retries (${maxRetries}) reached, advancing to next word`);
            if (!paused && !muted) {
              // Move on after too many failures
              goToNextWord();
            }
          }
        };
        
        // Actually start speaking
        window.speechSynthesis.speak(utterance);
        console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
        
        // Verify speech is working after a short delay
        setTimeout(() => {
          if (!window.speechSynthesis.speaking && !paused && !muted) {
            console.warn("Speech synthesis not speaking after 100ms");
            
            // If we haven't exceeded retry attempts, try again
            if (retryAttemptsRef.current < maxRetries) {
              retryAttemptsRef.current++;
              console.log(`Silent failure detected, retry ${retryAttemptsRef.current}/${maxRetries}`);
              playCurrentWord();
            } else {
              // If we've tried enough times, move on
              console.log("Moving to next word after silent failures");
              goToNextWord();
            }
          }
        }, 100);
        
      } catch (error) {
        console.error('Error in speech playback:', error);
        // Still try to advance to prevent getting stuck
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 1000);
        }
      }
    }, 50); // Small delay to ensure cancellation completes
  }, [currentWord, muted, paused, selectedVoice, cancelSpeech, findVoice, goToNextWord, maxRetries]);
  
  // Function to toggle mute with full speech handling
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      
      if (newMuted) {
        // When muting, cancel any current speech
        cancelSpeech();
      }
      
      return newMuted;
    });
  }, [cancelSpeech]);
  
  // Function to toggle pause with full speech handling
  const togglePause = useCallback(() => {
    setPaused(prev => {
      const newPaused = !prev;
      
      if (newPaused) {
        // When pausing, cancel current speech
        cancelSpeech();
      } else if (currentWord && userInteractionRef.current) {
        // When unpausing, play the current word after a brief delay
        setTimeout(() => playCurrentWord(), 50);
      }
      
      return newPaused;
    });
  }, [cancelSpeech, playCurrentWord, currentWord]);
  
  // Function to change voice with speech handling
  const changeVoice = useCallback((voiceRegion: 'US' | 'UK') => {
    setSelectedVoice(voiceRegion);
    console.log(`Voice changed to ${voiceRegion}`);
    
    // If we have a current word and we're not paused/muted, replay with new voice
    if (currentWord && !paused && !muted && userInteractionRef.current) {
      // Short delay to ensure state update completes
      setTimeout(() => playCurrentWord(), 50);
    }
  }, [currentWord, paused, muted, playCurrentWord]);
  
  // Essential cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [cancelSpeech]);
  
  // Effect to handle auto-play only AFTER user interaction
  useEffect(() => {
    if (currentWord && !muted && !paused && userInteractionRef.current) {
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        console.log('Auto-playing word after state change:', currentWord.word);
        playCurrentWord();
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentWord, muted, paused, playCurrentWord]);
  
  // Create voice options array for UI
  const voices = [
    { label: "US", region: "US" as const, gender: "female" as const, voice: null },
    { label: "UK", region: "UK" as const, gender: "female" as const, voice: null }
  ];
  
  return {
    currentWord,
    currentIndex,
    muted,
    paused,
    voices,
    selectedVoice: { 
      label: selectedVoice, 
      region: selectedVoice 
    },
    playCurrentWord,
    goToNextWord,
    toggleMute,
    togglePause,
    changeVoice,
    userInteractionRef
  };
};
