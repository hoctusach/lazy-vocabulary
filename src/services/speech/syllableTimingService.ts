import { VocabularyWord } from '@/types/vocabulary';
import { countVocabularyWordSyllables } from '@/utils/speech/syllableCounter';

const DEFAULT_MS_PER_SYLLABLE = 320;
const MIN_MS_PER_SYLLABLE = 110;
const MAX_MS_PER_SYLLABLE = 650;
const MIN_SPEECH_DURATION_MS = 900;
const MAX_SPEECH_DURATION_MS = 20000;

const MIN_POST_SPEECH_PAUSE = 1200;
const MAX_POST_SPEECH_PAUSE = 2500;
const POST_SPEECH_PAUSE_RATIO = 0.3;

const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now());

class SyllableTimingService {
  private averageMsPerSyllable = DEFAULT_MS_PER_SYLLABLE;
  private samples = 0;

  recordSample(syllableCount: number, durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return;
    }

    const safeSyllables = Math.max(1, Math.round(syllableCount));
    const perSyllable = durationMs / safeSyllables;
    const clamped = Math.max(MIN_MS_PER_SYLLABLE, Math.min(MAX_MS_PER_SYLLABLE, perSyllable));

    if (this.samples === 0) {
      this.averageMsPerSyllable = clamped;
    } else {
      const weight = Math.min(0.35, 1 / (this.samples + 1));
      this.averageMsPerSyllable = this.averageMsPerSyllable * (1 - weight) + clamped * weight;
    }

    this.samples = Math.min(this.samples + 1, 1000);
  }

  recordWordSample(word: Pick<VocabularyWord, 'word' | 'meaning' | 'example'>, durationMs: number): void {
    const syllableCount = countVocabularyWordSyllables(word);
    this.recordSample(syllableCount, durationMs);
  }

  estimateSpeechDurationFromSyllables(syllableCount: number): number {
    const safeSyllables = Math.max(1, Math.round(syllableCount));
    const estimated = safeSyllables * this.averageMsPerSyllable;
    return Math.max(MIN_SPEECH_DURATION_MS, Math.min(MAX_SPEECH_DURATION_MS, estimated));
  }

  estimateSpeechDurationForWord(word: Pick<VocabularyWord, 'word' | 'meaning' | 'example'>): number {
    const syllableCount = countVocabularyWordSyllables(word);
    return this.estimateSpeechDurationFromSyllables(syllableCount);
  }

  computePostSpeechPause(speechDurationMs: number): number {
    const pause = speechDurationMs * POST_SPEECH_PAUSE_RATIO;
    return Math.max(MIN_POST_SPEECH_PAUSE, Math.min(MAX_POST_SPEECH_PAUSE, pause));
  }

  estimateMutedAutoAdvanceDelay(word: Pick<VocabularyWord, 'word' | 'meaning' | 'example'>): number {
    const estimatedSpeech = this.estimateSpeechDurationForWord(word);
    const pause = this.computePostSpeechPause(estimatedSpeech);
    return estimatedSpeech + pause;
  }

  createStopwatch(): { start: () => void; stop: () => number | null } {
    let startedAt: number | null = null;
    return {
      start: () => {
        startedAt = now();
      },
      stop: () => {
        if (startedAt === null) return null;
        const elapsed = now() - startedAt;
        startedAt = null;
        return elapsed;
      }
    };
  }
}

export const syllableTimingService = new SyllableTimingService();
