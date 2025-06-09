
import { useState, useEffect, useRef, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { mobileAutoPlayManager } from '@/services/mobile/mobileAutoPlayManager';
import { mobileGestureDetector } from '@/services/mobile/mobileGestureDetector';

export const useMobileVocabularyController = (wordList: VocabularyWord[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(false);

  const autoPlayInitializedRef = useRef(false);
  const currentWord = wordList[currentIndex] || null;

  // Initialize auto-play when wordList is available
  useEffect(() => {
    if (wordList.length > 0 && !autoPlayInitializedRef.current) {
      console.log('[MOBILE-VOCAB-CONTROLLER] Initializing auto-play with', wordList.length, 'words');
      autoPlayInitializedRef.current = true;
      
      // Start auto-play immediately
      startAutoPlay();
    }
  }, [wordList]);

  const startAutoPlay = useCallback(() => {
    if (wordList.length === 0 || isAutoPlayActive) return;

    console.log('[MOBILE-VOCAB-CONTROLLER] Starting mobile auto-play');
    setIsAutoPlayActive(true);

    mobileAutoPlayManager.startAutoPlay(wordList, currentIndex, {
      voiceRegion,
      wordDisplayTime: 4000,
      onWordChange: (word, index) => {
        console.log('[MOBILE-VOCAB-CONTROLLER] Word changed to:', word.word);
        setCurrentIndex(index);
        setIsSpeaking(true);
      },
      onComplete: () => {
        console.log('[MOBILE-VOCAB-CONTROLLER] Auto-play completed');
        setIsAutoPlayActive(false);
        setIsSpeaking(false);
        // Restart from beginning
        setCurrentIndex(0);
        setTimeout(() => startAutoPlay(), 2000);
      }
    });
  }, [wordList, currentIndex, voiceRegion, isAutoPlayActive]);

  const goToNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % wordList.length;
    console.log('[MOBILE-VOCAB-CONTROLLER] Manual next to index:', nextIndex);
    
    setCurrentIndex(nextIndex);
    mobileAutoPlayManager.setCurrentWordIndex(nextIndex);
    
    if (!isPaused && !isMuted) {
      // Restart auto-play from new position
      mobileAutoPlayManager.stopAutoPlay();
      setTimeout(() => {
        mobileAutoPlayManager.startAutoPlay(wordList, nextIndex, {
          voiceRegion,
          wordDisplayTime: 4000,
          onWordChange: (word, index) => {
            setCurrentIndex(index);
            setIsSpeaking(true);
          },
          onComplete: () => {
            setIsAutoPlayActive(false);
            setIsSpeaking(false);
          }
        });
      }, 100);
    }
  }, [currentIndex, wordList, voiceRegion, isPaused, isMuted]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : wordList.length - 1;
    console.log('[MOBILE-VOCAB-CONTROLLER] Manual previous to index:', prevIndex);
    
    setCurrentIndex(prevIndex);
    mobileAutoPlayManager.setCurrentWordIndex(prevIndex);
    
    if (!isPaused && !isMuted) {
      // Restart auto-play from new position
      mobileAutoPlayManager.stopAutoPlay();
      setTimeout(() => {
        mobileAutoPlayManager.startAutoPlay(wordList, prevIndex, {
          voiceRegion,
          wordDisplayTime: 4000,
          onWordChange: (word, index) => {
            setCurrentIndex(index);
            setIsSpeaking(true);
          },
          onComplete: () => {
            setIsAutoPlayActive(false);
            setIsSpeaking(false);
          }
        });
      }, 100);
    }
  }, [currentIndex, wordList, voiceRegion, isPaused, isMuted]);

  const togglePause = useCallback(() => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    console.log('[MOBILE-VOCAB-CONTROLLER] Toggle pause:', newPausedState);
    
    if (newPausedState) {
      mobileAutoPlayManager.pauseAutoPlay();
      setIsSpeaking(false);
    } else {
      mobileAutoPlayManager.resumeAutoPlay({
        voiceRegion,
        wordDisplayTime: 4000,
        onWordChange: (word, index) => {
          setCurrentIndex(index);
          setIsSpeaking(true);
        },
        onComplete: () => {
          setIsAutoPlayActive(false);
          setIsSpeaking(false);
        }
      });
    }
  }, [isPaused, voiceRegion]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    console.log('[MOBILE-VOCAB-CONTROLLER] Toggle mute:', newMutedState);
    
    if (newMutedState) {
      mobileAutoPlayManager.stopAutoPlay();
      setIsSpeaking(false);
    } else if (!isPaused) {
      // Resume auto-play when unmuting
      setTimeout(() => startAutoPlay(), 100);
    }
  }, [isMuted, isPaused, startAutoPlay]);

  const toggleVoice = useCallback(() => {
    const newVoiceRegion = voiceRegion === 'US' ? 'UK' : 'US';
    setVoiceRegion(newVoiceRegion);
    console.log('[MOBILE-VOCAB-CONTROLLER] Voice region changed to:', newVoiceRegion);
  }, [voiceRegion]);

  const playCurrentWord = useCallback(() => {
    console.log('[MOBILE-VOCAB-CONTROLLER] Manual play current word');
    if (!isPaused && !isMuted && currentWord) {
      // Force gesture detection and start auto-play
      mobileGestureDetector.forceGestureDetection();
      setTimeout(() => startAutoPlay(), 100);
    }
  }, [isPaused, isMuted, currentWord, startAutoPlay]);

  // Monitor speech state
  useEffect(() => {
    const checkSpeechState = () => {
      const speechInProgress = mobileAutoPlayManager.isSpeechInProgress();
      if (speechInProgress !== isSpeaking) {
        setIsSpeaking(speechInProgress);
      }
    };

    const interval = setInterval(checkSpeechState, 100);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  return {
    currentWord,
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    goToNext,
    goToPrevious,
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord,
    wordCount: wordList.length
  };
};
