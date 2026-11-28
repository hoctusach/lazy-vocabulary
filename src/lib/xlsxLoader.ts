/**
 * [FB-84] The xlsx library (~400 KB) is only needed when a spreadsheet is imported or the Excel template is
 * downloaded, so it is loaded on demand into its own chunk instead of the entry bundle.
 */
type XlsxModule = typeof import('xlsx');
let loaded: XlsxModule | null = null;
let pending: Promise<XlsxModule> | null = null;

export function loadXlsx(): Promise<XlsxModule> {
  if (loaded) return Promise.resolve(loaded);
  pending ??= import('xlsx').then((m) => (loaded = m));
  return pending;
}

/** Synchronous access once `loadXlsx()` has resolved (the sync workbook parser relies on it). */
export function getLoadedXlsx(): XlsxModule {
  if (!loaded) throw new Error('xlsx not loaded: await loadXlsx() first');
  return loaded;
}
