export const CATEGORY_LABELS: Record<string, string> = {
  'phrasal verbs': 'Phrasal Verb',
  'idioms': 'Idiom',
  'topic vocab': 'Topic vocabulary',
  'grammar': 'Grammar',
  'phrases, collocations': 'Phrase - Collocation',
  'word formation': 'Word formation',
};

export const CATEGORY_MESSAGE_LABELS: Record<string, string> = {
  'phrasal verbs': 'Phrasal Verb',
  'idioms': 'Idiom',
  'topic vocab': 'Topic vocabulary',
  'grammar': 'Grammar',
  'phrases, collocations': 'Phrase - Collocation',
  'word formation': 'Word formation',
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ||
    category.charAt(0).toUpperCase() + category.slice(1);
}

export function getCategoryMessageLabel(category: string): string {
  return CATEGORY_MESSAGE_LABELS[category] || getCategoryLabel(category);
}
