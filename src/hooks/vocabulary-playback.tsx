
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking } from '@/utils/speech';

export const useVocabularyPlayback = (wordList: VocabularyWord[]) => {
  // State for managing playback
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'US' | 'UK'>('US');
  
  // Important refs for tracking state
  const userInteractionRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceInitializedRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  
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
  
  // Function to find the appropriate voice
  const findVoice = useCallback((region: 'US' | 'UK'): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    console.log(`Finding ${region} voice among ${voices.length} voices`);
    
    if (voices.length === 0) {
      console.warn('No voices available');
      return null;
    }
    
    // Try to find a voice that matches the region and is female
    let voice: SpeechSynthesisVoice | null = null;
    
    if (region === 'UK') {
      console.log('Looking for UK female voice');
      // Try to find UK female voice by name patterns
      voice = voices.find(v => 
        /UK English Female|en-GB.*female|Google UK|British/i.test(v.name)
      );
      
      // If no specific female voice found, try any en-GB voice
      if (!voice) {
        voice = voices.find(v => v.lang === 'en-GB');
      }
    } else {
      console.log('Looking for US female voice');
      // Try to find US female voice by name patterns
      voice = voices.find(v => 
        /US English Female|en-US.*female|Google US|Samantha/i.test(v.name)
      );
      
      // If no specific female voice found, try any en-US voice
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
    }
    
    return voice;
  }, []);
  
  // Function to cancel any current speech
  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      console.log('Speech canceled');
    }
  }, []);
  
  // Function to play the current word with proper voice selection
  const playCurrentWord = useCallback(() => {
    // Mark that we've had user interaction - crucial for browser audio permissions
    userInteractionRef.current = true;
    
    if (!currentWord || muted || paused) {
      console.log('Cannot play word: muted, paused, or no word available');
      return;
    }
    
    console.log(`Playing word: ${currentWord.word}`);
    
    // IMPORTANT: Cancel any ongoing speech to prevent queuing
    cancelSpeech();
    
    // Wait a tick to ensure voices are loaded and cancellation is complete
    setTimeout(() => {
      try {
        // Ensure voices are loaded (critical for iOS/Safari)
        const voices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded: ${voices.length} voices available`);
        
        // Create a fresh utterance for each word (don't reuse old ones)
        const utterance = new SpeechSynthesisUtterance();
        utteranceRef.current = utterance;
        
        // Set the text with proper concatenation and pauses
        const wordText = currentWord.word;
        const meaningText = currentWord.meaning || '';
        const exampleText = currentWord.example || '';
        
        utterance.text = `${wordText}. ${meaningText}. ${exampleText}`.trim();
        
        // Set the language based on selected region
        utterance.lang = selectedVoice === 'UK' ? 'en-GB' : 'en-US';
        
        // Find and set the appropriate voice
        const voice = findVoice(selectedVoice);
        if (voice) {
          utterance.voice = voice;
          console.log(`Using voice: ${voice.name} (${voice.lang})`);
        } else {
          console.log('No matching voice found, using browser default');
        }
        
        // Set speech parameters
        utterance.rate = 0.9; // Slightly slower for better comprehension
        utterance.pitch = 1.0;
        utterance.volume = 1.0; // Full volume
        
        // Handle events for auto-advancement
        utterance.onend = () => {
          console.log(`Speech ended for: ${currentWord.word}`);
          retryAttemptsRef.current = 0;
          
          // Only auto-advance if not paused and not muted
          if (!paused && !muted) {
            goToNextWord();
          }
        };
        
        utterance.onerror = (event) => {
          console.error(`Speech synthesis error: ${event.error}`, event);
          
          // Handle not-allowed error (permission issue) with retry
          if (event.error === 'not-allowed') {
            console.log('Detected not-allowed error, attempting to retry...');
            
            // For not-allowed errors, try to resume speech and retry once
            window.speechSynthesis.resume();
            
            // Increment retry counter
            retryAttemptsRef.current++;
            
            // Only retry a limited number of times
            if (retryAttemptsRef.current <= 2) {
              // Wait a moment and try one more time
              setTimeout(() => {
                try {
                  // Ensure voices are loaded before retry
                  window.speechSynthesis.getVoices();
                  window.speechSynthesis.speak(utterance);
                  console.log(`Retry attempt ${retryAttemptsRef.current} after not-allowed error`);
                } catch (secondError) {
                  console.error('Retry failed:', secondError);
                  // On repeated failure, still advance to prevent getting stuck
                  if (!paused && !muted) {
                    goToNextWord();
                  }
                }
              }, 150);
            } else {
              console.log('Max retries reached, advancing to next word');
              // On repeated failures, just advance to next word
              if (!paused && !muted) {
                goToNextWord();
              }
            }
          } else {
            // For other errors, also advance to next word to prevent getting stuck
            if (!paused && !muted) {
              goToNextWord();
            }
          }
        };
        
        // For debugging
        utterance.onstart = () => {
          console.log(`Speech started for: ${currentWord.word}`);
        };
        
        // Ensure voices are loaded one more time just before speaking
        window.speechSynthesis.getVoices();
        
        // Speak the text
        window.speechSynthesis.speak(utterance);
        console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
        
        // Verify speech is actually working
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log('Speech synthesis is actively speaking');
          } else {
            console.log('Speech synthesis not speaking, may be blocked');
            
            // If speech isn't happening after 100ms, try one more time
            if (retryAttemptsRef.current === 0) {
              retryAttemptsRef.current++;
              console.log('Attempting one more time to speak');
              window.speechSynthesis.speak(utterance);
            }
          }
        }, 100);
      } catch (error) {
        console.error('Error starting speech:', error);
        // Still advance to prevent getting stuck
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 1000);
        }
      }
    }, 50);
  }, [currentWord, muted, paused, selectedVoice, cancelSpeech, findVoice]);
  
  // Function to advance to next word
  const goToNextWord = useCallback(() => {
    if (wordList.length === 0) return;
    
    // Cancel any ongoing speech
    cancelSpeech();
    
    // Move to next word
    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % wordList.length;
      return nextIndex;
    });
  }, [wordList.length, cancelSpeech]);
  
  // Function to toggle mute
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
  
  // Function to toggle pause
  const togglePause = useCallback(() => {
    setPaused(prev => {
      const newPaused = !prev;
      
      if (newPaused) {
        // When pausing, cancel current speech
        cancelSpeech();
      }
      
      return newPaused;
    });
  }, [cancelSpeech]);
  
  // Function to change voice
  const changeVoice = useCallback((voiceRegion: 'US' | 'UK') => {
    setSelectedVoice(voiceRegion);
    console.log(`Voice changed to ${voiceRegion}`);
    
    // Note: We deliberately don't cancel speech here
    // The new voice will be used for the next word
  }, []);
  
  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [cancelSpeech]);
  
  // Effect to automatically play the next word when needed
  useEffect(() => {
    // Only auto-play after we've had user interaction
    if (currentWord && wordList.length > 0 && !muted && !paused && userInteractionRef.current) {
      // Don't play automatically on first load or when manually advanced
      if (voiceInitializedRef.current) {
        console.log(`Auto-playing word after state change: ${currentWord.word}`);
        playCurrentWord();
      } else {
        voiceInitializedRef.current = true;
      }
    }
  }, [currentWord, wordList.length, muted, paused, playCurrentWord]);
  
  // Combined data structure for voice options
  const voices = [
    { label: "US", region: "US" as const },
    { label: "UK", region: "UK" as const }
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
