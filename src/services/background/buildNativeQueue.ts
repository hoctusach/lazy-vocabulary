import type { VocabularyWord } from '@/types/vocabulary';
import { getKokoroVoiceByName, mapRateToKokoroSpeed } from '@/services/speech/kokoro/kokoroVoices';
import { sanitizeVoiceName } from '@/services/speech/voiceAccess';
import { getCategoryLabel } from '@/utils/categoryLabels';
import { getTranslationOverride } from '@/lib/translations/translationOverrides';
import { shouldShowDefaultVi } from '@/lib/translations/showDefaultVi';
import type { PlaybackQueue } from './playbackService';

/**
 * [FB-65] The translation the in-app card shows (FB-42/FB-64): the user's override always, else the default only when
 * `shouldShowDefaultVi()`. Same rule as EditableTranslation, so the notification never leaks a hidden translation.
 */
export function effectiveTranslation(w: Pick<VocabularyWord, 'word' | 'category' | 'translation' | 'sourceId'>, showDefault = shouldShowDefaultVi()): string {
  const override = getTranslationOverride({ word: w.word, category: w.category, sourceId: w.sourceId });
  if (override !== undefined) return override;
  return showDefault ? w.translation ?? '' : '';
}

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
  opts: {
    voiceName?: string | null;
    /** [FB-61] Native voice name for a system voice (looked up from the voice list when omitted). */
    voiceUri?: string | null;
    rate: number;
    muted: boolean;
    lang?: string;
  },
): PlaybackQueue | null {
  if (list.length === 0) return null;
  // Window of NATIVE_QUEUE_MAX words that starts at the current one (the controller wraps around the list).
  const start = findQueueIndex(list, current);
  const rotated = [...list.slice(start), ...list.slice(0, start)].slice(0, NATIVE_QUEUE_MAX);
  // [FB-61] Same voice rule as the foreground: a free user's locked Michael is Heart; a system voice keeps its own name.
  const chosen = sanitizeVoiceName(opts.voiceName ?? null);
  const kokoro = getKokoroVoiceByName(chosen);
  const systemVoiceName = kokoro ? undefined : (opts.voiceUri ?? lookupVoiceUri(chosen)) || undefined;
  const showDefault = shouldShowDefaultVi();
  return {
    items: rotated.map((w) => ({
      word: w.word,
      meaning: w.meaning ?? '',
      example: w.example ?? '',
      translation: effectiveTranslation(w, showDefault),
      category: w.category ?? '',
      categoryLabel: w.category ? getCategoryLabel(w.category) : '',
      pauseMs: NATIVE_PAUSE_MS,
    })),
    index: 0,
    engine: kokoro ? 'kokoro' : 'system',
    voice: kokoro?.id,
    voiceName: systemVoiceName,
    speed: kokoro ? mapRateToKokoroSpeed(opts.rate, kokoro) : undefined,
    rate: opts.rate,
    lang: opts.lang ?? 'en-US',
    muted: opts.muted,
  };
}

/** The native name (voiceURI) of a listed system voice, for the service's TextToSpeech.setVoice. */
function lookupVoiceUri(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  try {
    const v = window.speechSynthesis?.getVoices?.().find((x) => x.name === name);
    return v?.voiceURI || undefined;
  } catch {
    return undefined;
  }
}
