const MIN_MS = 4000;
const MAX_MS = 30000;
const MS_PER_WORD = 400; // ~150 words per minute, a relaxed reading pace
const PADDING_MS = 1500;

/**
 * How long to leave a card on screen when nothing can read it aloud
 * (no speech engine on the device), so auto-advance still moves on.
 */
export function estimateReadingTimeMs(text: string): number {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean).length;
  const ms = PADDING_MS + words * MS_PER_WORD;
  return Math.min(MAX_MS, Math.max(MIN_MS, ms));
}
