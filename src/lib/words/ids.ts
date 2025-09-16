export function toWordId(wordText: string, category?: string) {
  const clean = (s: string) =>
    (s || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[()]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const base = clean(wordText);
  const cat = clean(category || '');
  return cat ? `${cat}::${base}` : base;
}
