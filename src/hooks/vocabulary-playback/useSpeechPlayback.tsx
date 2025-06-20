
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from './useVoiceSelection';
import { useSpeechPlaybackCore } from './speech-playback/useSpeechPlaybackCore';

export const useSpeechPlayback = (
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>,
  selectedVoice: VoiceSelection,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  // Use our refactored core hook implementation
  return useSpeechPlaybackCore(
    utteranceRef,
    selectedVoice,
    advanceToNext,
    muted,
    paused
  );
};
