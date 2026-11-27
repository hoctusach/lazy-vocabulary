import type { VocabularyWord } from '@/types/vocabulary';
import { getKokoroVoiceByName, mapRateToKokoroSpeed } from '@/services/speech/kokoro/kokoroVoices';
import type { PlaybackQueue } from './playbackService';

/** Pause between words handed to the native service (matches the in-app post-speech pause floor, FB-52). */
export const NATIVE_PAUSE_MS = 1500;
/** Upper bound on words pushed to the service (keeps the bridge payload small). */
export const NATIVE_QUEUE_MAX = 200;

export function findQueueIndex(list: readonly Pick<VocabularyWord, 'word' | 'category'>[], current: Pick<VocabularyWord, 'word' | 'category'> | null | undefined): number {
  if (!current) return 0;
  const exact = list.findIndex((w) => w.word === current.word && (w.category ?? '') === (current.category ?? ''));
  if (exact >= 0) return exact;
  return Math.max(0, list.findIndex((w) => w.word === current.word));
}

/**
 * The words the native service speaks when the WebView is frozen: the playback list in order, rotated so the current
 * word is first (the controller wraps around), plus the voice config. Muted stays silent but keeps the timing (FB-30).
 */
export function buildNativeQueue(
  list: readonly VocabularyWord[],
  current: Pick<VocabularyWord, 'word' | 'category'> | null | undefined,
  opts: { voiceName?: string | null; rate: number; muted: boolean; lang?: string },
): PlaybackQueue | null {
  if (list.length === 0) return null;
  // Window of NATIVE_QUEUE_MAX words that starts at the current one (the controller wraps around the list).
  const start = findQueueIndex(list, current);
  const rotated = [...list.slice(start), ...list.slice(0, start)].slice(0, NATIVE_QUEUE_MAX);
  const kokoro = getKokoroVoiceByName(opts.voiceName);
  return {
    items: rotated.map((w) => ({
      word: w.word,
      meaning: w.meaning ?? '',
      example: w.example ?? '',
      translation: w.translation ?? '',
      category: w.category ?? '',
      pauseMs: NATIVE_PAUSE_MS,
    })),
    index: 0,
    engine: kokoro ? 'kokoro' : 'system',
    voice: kokoro?.id,
    speed: kokoro ? mapRateToKokoroSpeed(opts.rate, kokoro) : undefined,
    rate: opts.rate,
    lang: opts.lang ?? 'en-US',
    muted: opts.muted,
  };
}
