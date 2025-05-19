
import { useVocabularyPlaybackCore } from './useVocabularyPlaybackCore';
import { VocabularyWord } from '@/types/vocabulary';

export const useVocabularyPlayback = (wordList: VocabularyWord[]) => {
  return useVocabularyPlaybackCore(wordList);
};

export * from './useVoiceSelection';
export * from './useAudioControl';
export * from './useWordNavigation';
export * from './useSpeechPlayback';
