/**
 * Tiny pub/sub between the translation editor (inside the word card) and the Learn player.
 * The player pauses while a translation is being edited, and after a successful save shows "Saved",
 * moves to the next word and resumes. Cancel only restores the previous play state.
 */
export type TranslationEditEvent = 'start' | 'save' | 'cancel';
export const TRANSLATION_EDIT_SIGNAL = 'lv:translation-edit';
export const SAVED_CONFIRM_MS = 1200;

export function emitTranslationEdit(event: TranslationEditEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<TranslationEditEvent>(TRANSLATION_EDIT_SIGNAL, { detail: event }));
}

export function onTranslationEdit(cb: (e: TranslationEditEvent) => void): () => void {
  const h = (ev: Event) => cb((ev as CustomEvent<TranslationEditEvent>).detail);
  window.addEventListener(TRANSLATION_EDIT_SIGNAL, h);
  return () => window.removeEventListener(TRANSLATION_EDIT_SIGNAL, h);
}
