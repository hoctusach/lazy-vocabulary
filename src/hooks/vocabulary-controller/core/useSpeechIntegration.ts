import * as React from 'react';
import { useEffect, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceRegion } from '@/types/speech';

interface SpeechIntegrationProps {
  currentWord: VocabularyWord | null;
  isMuted: boolean;
  isPaused: boolean;
  voiceRegion: VoiceRegion;
  speakCurrentWord: (forceSpeak?: boolean) => void;
}

export const useSpeechIntegration = ({
  currentWord,
  isMuted,
  isPaused,
  voiceRegion,
  speakCurrentWord
}: SpeechIntegrationProps) => {
  // Effect to trigger speech when dependencies change
  useEffect(() => {
    if (!currentWord) {
      console.log('[SPEECH-INTEGRATION] No current word, skipping speech');
      return;
    }

    if (isMuted || isPaused) {
      console.log('[SPEECH-INTEGRATION] Speech is muted or paused, skipping speech');
      return;
    }

    console.log('[SPEECH-INTEGRATION] Dependencies changed, attempting to speak:', currentWord.word);
    speakCurrentWord();

  }, [currentWord, isMuted, isPaused, voiceRegion, speakCurrentWord]);
};
