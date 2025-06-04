
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { useSimpleSpeechPlayback } from './useSimpleSpeechPlayback';

export const useSpeechPlaybackCore = (
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>,
  selectedVoice: VoiceSelection,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  // Use our simplified speech playback
  return useSimpleSpeechPlayback(selectedVoice, advanceToNext, muted, paused);
};
