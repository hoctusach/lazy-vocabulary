import { US_VOICE_NAME, UK_VOICE_NAMES, AU_VOICE_NAMES } from './voiceNames';

export const VOICE_VARIANTS = {
  US: [US_VOICE_NAME],
  UK: UK_VOICE_NAMES,
  AU: AU_VOICE_NAMES
} as const;

export type VoiceVariant = typeof VOICE_VARIANTS[keyof typeof VOICE_VARIANTS][number];
