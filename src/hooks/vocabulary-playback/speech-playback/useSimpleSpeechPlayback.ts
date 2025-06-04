
import { VoiceSelection } from '../useVoiceSelection';
import { useSpeechPlaybackCore } from './useSpeechPlaybackCore';

export const useSimpleSpeechPlayback = (
  selectedVoice: VoiceSelection,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  // Create a dummy utterance ref since the core expects it but doesn't use it
  const utteranceRef = { current: null };
  
  // Use our refactored core implementation
  return useSpeechPlaybackCore(
    utteranceRef,
    selectedVoice,
    advanceToNext,
    muted,
    paused
  );
};
