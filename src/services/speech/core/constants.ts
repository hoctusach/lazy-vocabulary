/**
 * Shared constants for speech services
 */
export const DEFAULT_SPEECH_RATE = 0.8;

/** Minimum rate that produces a reliable change in most browsers */
export const MIN_SPEECH_RATE = 0.6;

/** Maximum rate we currently expose in the UI */
export const MAX_SPEECH_RATE = 2;

/**
 * Discrete rate options exposed to users. Keeping the list here avoids
 * hard-coded duplicates between UI and business logic.
 */
export const SPEECH_RATE_OPTIONS = [0.6, 0.8, 1, 1.25, 1.5, 1.75, 2] as const;
