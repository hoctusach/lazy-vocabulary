import { shouldShowDefaultVi } from '@/lib/translations/showDefaultVi';
import { getPrimaryDeviceLanguage } from '@/utils/deviceLanguage';

/**
 * [FB-66] On-device translation behind an adapter (ML Kit Translation on native, mock in e2e, absent on web), plus the one
 * rule that decides whether to translate at all. The rule reuses the FB-42 / FB-64 helpers; it adds no parallel setting.
 */
export interface TranslationAdapter {
  isAvailable(): Promise<boolean>;
  isModelDownloaded(language: string): Promise<boolean>;
  /** Download one language pack (no progress events exist, so the UI shows an indeterminate bar). */
  downloadModel(language: string): Promise<void>;
  translate(text: string, from: string, to: string): Promise<string>;
}

declare global {
  interface Window {
    /** Test hook: a mock TranslationAdapter (e2e). */
    __LV_TRANSLATION_ADAPTER__?: TranslationAdapter;
  }
}

let platformFactory: (() => Promise<TranslationAdapter | null>) | null = null;
export function registerPlatformTranslationAdapter(factory: () => Promise<TranslationAdapter | null>): void {
  platformFactory = factory;
}

/** Null on web (no on-device translation): the field simply stays editable / empty. */
export async function getTranslationAdapter(): Promise<TranslationAdapter | null> {
  if (typeof window !== 'undefined' && window.__LV_TRANSLATION_ADAPTER__) return window.__LV_TRANSLATION_ADAPTER__;
  return (await platformFactory?.()) ?? null;
}

export type TranslationPlan =
  | { action: 'skip'; reason: 'same-language' | 'hidden' }
  | { action: 'translate'; from: string; to: string };

const primary = (tag: string) => tag.toLowerCase().split(/[-_]/)[0];

export interface PlanInput {
  /** Language of the scanned text (the learning language). */
  source: string;
  /** Device language tag; defaults to the real device language. */
  device?: string;
  /** Whether the card would show a default translation; defaults to the FB-42 / FB-64 rule. */
  showDefault?: boolean;
}

/**
 * 1. Device language == learning language: nothing to translate to (today: an English device).
 * 2. The card would not show a default translation (not a Vietnamese device and the FB-64 toggle is off): skip.
 * 3. Otherwise translate into the device language.
 */
export function planTranslation(input: PlanInput): TranslationPlan {
  const source = primary(input.source);
  const device = primary(input.device ?? getPrimaryDeviceLanguage());
  if (!device || device === source) return { action: 'skip', reason: 'same-language' };
  if (!(input.showDefault ?? shouldShowDefaultVi())) return { action: 'skip', reason: 'hidden' };
  return { action: 'translate', from: source, to: device };
}
