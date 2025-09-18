const WARN_ONCE_KEY = '__lazyVoca_backfill_warned__';

export async function autoBackfillOnReload(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as unknown as Record<string, boolean>)[WARN_ONCE_KEY]) return;
  (window as unknown as Record<string, boolean>)[WARN_ONCE_KEY] = true;
  console.warn(
    '[sync:autoBackfillOnReload] Disabled because legacy tables were removed from the schema. Backfill now only happens when SRS data is synchronised directly via learned_words/user_progress_summary.'
  );
}
