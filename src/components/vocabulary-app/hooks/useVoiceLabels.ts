
import { VoiceSelection } from "@/hooks/vocabulary-playback/useVoiceSelection";

/**
 * Calculates next voice label for display
 */
export const useVoiceLabels = (selectedVoice: VoiceSelection) => {
  const nextVoiceLabel =
    selectedVoice.region === 'UK'
      ? 'US'
      : selectedVoice.region === 'US'
      ? 'AU'
      : 'US';

  return { nextVoiceLabel };
};
