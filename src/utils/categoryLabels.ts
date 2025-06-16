export const CATEGORY_LABELS: Record<string, string> = {
  'phrases, collocations': 'Phrasals',
  'topic vocab': 'Topic',
  'phrasal verbs': 'Phrasal V',
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ||
    category.charAt(0).toUpperCase() + category.slice(1);
}
