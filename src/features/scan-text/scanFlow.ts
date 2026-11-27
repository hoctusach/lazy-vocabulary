import { canonicalManualCategory, MANUAL_DEFAULT_CATEGORY, type ManualWordInput } from '@/features/word-sets/manualSet';
import { canScan, recordScan } from './dailyLimit';
import { getLanguageProfile, type LanguageProfile } from './languages';
import { lookupMeaning, type LookupOptions, type MeaningResult } from './meaning';
import { ScanError, getScanAdapter, type ImageSource, type ScanAdapter } from './ocr';
import { getTranslationAdapter, planTranslation, type PlanInput, type TranslationAdapter } from './translation';

/** [FB-66] The scan flow's logic, free of React so it can be tested with stub adapters / providers. */

export type ScanOutcome =
  | { status: 'ok'; text: string }
  | { status: 'blocked' } // free daily limit reached
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'empty' } // OCR ran but found no text: not counted
  | { status: 'failed'; message: string };

export interface ScanOptions {
  source: ImageSource;
  unlimited: boolean;
  profile?: LanguageProfile;
  adapter?: ScanAdapter;
}

/** Pick an image, run OCR for the profile's script, and count the scan only when text was actually read. */
export async function performScan(opts: ScanOptions): Promise<ScanOutcome> {
  if (!canScan(opts.unlimited)) return { status: 'blocked' };
  const profile = opts.profile ?? getLanguageProfile();
  const adapter = opts.adapter ?? (await getScanAdapter());
  if (!(await adapter.isAvailable())) return { status: 'unavailable' };
  try {
    const image = await adapter.pickImage(opts.source);
    if (!image) return { status: 'cancelled' };
    const { text } = await adapter.recognize(image, profile.script);
    if (!text.trim()) return { status: 'empty' };
    recordScan();
    return { status: 'ok', text };
  } catch (e) {
    if (e instanceof ScanError && e.code === 'unavailable') return { status: 'unavailable' };
    return { status: 'failed', message: e instanceof ScanError ? e.message : 'Could not read text from that image.' };
  }
}

/** The bundled words carry Vietnamese translations; reuse one only when that is the language we are translating into. */
const BUNDLED_TRANSLATION_LANGUAGE = 'vi';

export interface Prefill {
  form: Required<ManualWordInput>;
  meaning: MeaningResult;
}

export interface PrefillOptions extends LookupOptions {
  phrase: string;
  example: string;
  /** Overrides for the translation rule (tests); defaults to the real device language and FB-42 / FB-64 rule. */
  plan?: Pick<PlanInput, 'device' | 'showDefault'>;
}

/** Word (+ IPA), meaning, category and example for the preview form. Translation is filled separately (it may need a download). */
export async function buildPrefill(o: PrefillOptions): Promise<Prefill & { bundledTranslation?: string }> {
  const meaning = await lookupMeaning(o.phrase, o);
  const hit = meaning.status === 'found' ? meaning.hit : null;
  const profile = o.profile ?? getLanguageProfile();
  const plan = planTranslation({ source: profile.code, ...o.plan });
  const bundled = hit?.translation && plan.action === 'translate' && plan.to === BUNDLED_TRANSLATION_LANGUAGE ? hit.translation : undefined;
  return {
    meaning,
    bundledTranslation: bundled,
    form: {
      word: hit?.ipa ? `${o.phrase} ${hit.ipa}` : o.phrase,
      meaning: hit?.meaning ?? '',
      category: canonicalManualCategory(hit?.category) ?? MANUAL_DEFAULT_CATEGORY,
      translation: bundled ?? '',
      example: o.example || hit?.example || '',
    },
  };
}

export type TranslateOutcome =
  | { status: 'ok'; text: string }
  | { status: 'skipped'; reason: 'same-language' | 'hidden' }
  | { status: 'unavailable' }
  | { status: 'declined' } // user said no to the language-pack download
  | { status: 'failed' };

export interface TranslateOptions {
  phrase: string;
  profile?: LanguageProfile;
  plan?: Pick<PlanInput, 'device' | 'showDefault'>;
  adapter?: TranslationAdapter | null;
  /** Called before any download; resolve false to decline. Defaults to declining (nothing downloads silently). */
  confirmDownload?: (languages: string[]) => Promise<boolean>;
  onDownloading?: (language: string) => void;
}

/** Translate into the device language when the rule says so. Never throws: failure leaves the field empty and editable. */
export async function translatePhrase(o: TranslateOptions): Promise<TranslateOutcome> {
  const profile = o.profile ?? getLanguageProfile();
  const plan = planTranslation({ source: profile.code, ...o.plan });
  if (plan.action === 'skip') return { status: 'skipped', reason: plan.reason };
  const adapter = o.adapter === undefined ? await getTranslationAdapter() : o.adapter;
  try {
    if (!adapter || !(await adapter.isAvailable())) return { status: 'unavailable' };
    const missing: string[] = [];
    for (const lang of [plan.from, plan.to]) if (!(await adapter.isModelDownloaded(lang))) missing.push(lang);
    if (missing.length) {
      if (!(await (o.confirmDownload?.(missing) ?? Promise.resolve(false)))) return { status: 'declined' };
      for (const lang of missing) { o.onDownloading?.(lang); await adapter.downloadModel(lang); }
    }
    return { status: 'ok', text: (await adapter.translate(o.phrase, plan.from, plan.to)).trim() };
  } catch {
    return { status: 'failed' };
  }
}
