import { useVocabularyPlaybackCore } from './useVocabularyPlaybackCore';
import { VocabularyWord } from '@/types/vocabulary';

export const useVocabularyPlayback = (wordList: VocabularyWord[]) => {
  return useVocabularyPlaybackCore(wordList);
};

// Export the simplified vocabulary playback system
export { useSimpleVocabularyPlayback } from './useSimpleVocabularyPlayback';
export { useSimpleWordPlayback } from './useSimpleWordPlayback';
export { useSimpleWordNavigation } from './useSimpleWordNavigation';

// Keep existing exports for backward compatibility
export * from './useVoiceSelection';
export * from './useWordNavigation';
export * from './useAudioControl';
export * from './useSpeechPlayback';
export * from './useVocabularyPlaybackCore';
export * from './core';
export * from './speech-playback';
