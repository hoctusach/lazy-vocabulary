
import { useCallback, useRef, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';
import { sanitizeForDisplay } from '@/utils/security/contentSecurity';

export const useSimpleSpeechPlayback = (
  selectedVoice: VoiceSelection,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isPlayingRef = useRef(false);

  // Find voice by region
  const findVoice = useCallback((region: 'US' | 'UK') => {
    const voices = window.speechSynthesis?.getVoices() || [];
    const lang = region === 'US' ? 'en-US' : 'en-GB';
    return voices.find(voice => voice.lang.startsWith(lang)) || null;
  }, []);

  // Create speech text from vocabulary word
  const createSpeechText = useCallback((word: VocabularyWord) => {
    const sanitizedWord = sanitizeForDisplay(word.word || '');
    const sanitizedMeaning = sanitizeForDisplay(word.meaning || '');
    const sanitizedExample = sanitizeForDisplay(word.example || '');
    
    let textToSpeak = sanitizedWord;
    
    if (sanitizedMeaning && sanitizedMeaning.trim().length > 0) {
      textToSpeak += `. ${sanitizedMeaning}`;
    }
    
    if (sanitizedExample && sanitizedExample.trim().length > 0) {
      textToSpeak += `. ${sanitizedExample}`;
    }
    
    return textToSpeak;
  }, []);

  const playWord = useCallback(async (wordToPlay: VocabularyWord | null) => {
    // Prevent overlapping speech
    if (isPlayingRef.current) {
      console.log('Speech already in progress, skipping');
      return;
    }

    // Basic checks
    if (!wordToPlay || muted || paused) {
      console.log(`Cannot play word: ${!wordToPlay ? 'No word' : muted ? 'Muted' : 'Paused'}`);
      return;
    }
    
    console.log(`Playing word: ${wordToPlay.word}`);
    isPlayingRef.current = true;
    
    // Stop any ongoing speech
    simpleSpeechController.stop();
    
    try {
      const speechText = createSpeechText(wordToPlay);
      const voice = findVoice(selectedVoice.region);
      
      console.log('Speaking with voice:', voice?.name || 'default system voice');
      
      const success = await simpleSpeechController.speak(speechText, {
        voice,
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        onStart: () => {
          console.log(`Speech started for: ${wordToPlay.word}`);
          setIsSpeaking(true);
        },
        onEnd: () => {
          console.log(`Speech ended for: ${wordToPlay.word}`);
          setIsSpeaking(false);
          isPlayingRef.current = false;
          
          // Auto-advance
          if (!paused && !muted) {
            console.log("Auto-advancing to next word");
            setTimeout(() => advanceToNext(), 1500);
          }
        },
        onError: (event) => {
          console.error(`Speech error: ${event.error} for word ${wordToPlay.word}`);
          setIsSpeaking(false);
          isPlayingRef.current = false;
          
          // Still advance on error to prevent getting stuck
          if (!paused && !muted) {
            setTimeout(() => advanceToNext(), 1000);
          }
        }
      });
      
      if (!success) {
        console.warn('Speech failed to start');
        setIsSpeaking(false);
        isPlayingRef.current = false;
        if (!paused && !muted) {
          setTimeout(() => advanceToNext(), 2000);
        }
      }
    } catch (error) {
      console.error("Error in playWord function:", error);
      setIsSpeaking(false);
      isPlayingRef.current = false;
      if (!paused && !muted) {
        setTimeout(() => advanceToNext(), 2000);
      }
    }
  }, [selectedVoice, advanceToNext, muted, paused, findVoice, createSpeechText]);
  
  return {
    playWord,
    isSpeaking
  };
};
