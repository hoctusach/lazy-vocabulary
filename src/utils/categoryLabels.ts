export const CATEGORY_LABELS: Record<string, string> = {
  'phrases, collocations': 'Phrasals',
  'topic vocab': 'Topic',
  'phrasal verbs': 'Phrasal V',
};

export const CATEGORY_MESSAGE_LABELS: Record<string, string> = {
  'phrases, collocations': 'Phrases, Collocations',
  'topic vocab': 'Topic Vocabulary',
  'phrasal verbs': 'Phrasal Verbs',
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ||
    category.charAt(0).toUpperCase() + category.slice(1);
}

export function getCategoryMessageLabel(category: string): string {
  return CATEGORY_MESSAGE_LABELS[category] || getCategoryLabel(category);
}
