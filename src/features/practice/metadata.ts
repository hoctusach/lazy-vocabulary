import type { VocabularyWord } from '@/types/vocabulary';
import type { PracticeMetadata, PracticeRuleConfig } from './types';

const COMMON_PRONOUNS = ['i', 'you', 'we', 'they', 'he', 'she', 'it'];

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export function normalizePracticeText(value: string): string {
  return value.toLowerCase().replace(/[’']/g, "'").trim();
}

export function tokenizePracticeText(value: string): string[] {
  return normalizePracticeText(value).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
}

function deriveForms(lemma: string): string[] {
  const normalized = normalizePracticeText(lemma).replace(/[^a-z0-9\s-]/g, '');
  const base = normalized.split(/[\s-]+/)[0] || normalized;
  const forms = [base];

  if (base.endsWith('y') && !/[aeiou]y$/.test(base)) {
    forms.push(`${base.slice(0, -1)}ies`, `${base.slice(0, -1)}ied`);
  } else {
    forms.push(`${base}s`, `${base}ed`);
  }

  if (base.endsWith('e')) {
    forms.push(`${base.slice(0, -1)}ing`);
  } else {
    forms.push(`${base}ing`);
  }

  return unique(forms);
}

function extractKeywords(...sources: Array<string | undefined>): string[] {
  const stopWords = new Set([
    ...COMMON_PRONOUNS,
    'a', 'an', 'and', 'are', 'as', 'be', 'by', 'for', 'from', 'in', 'is', 'of', 'on', 'or', 'the', 'to', 'with', 'your', 'my', 'this', 'that', 'can', 'will', 'about'
  ]);

  return unique(
    sources
      .flatMap((source) => tokenizePracticeText(source ?? ''))
      .filter((token) => token.length > 3 && !stopWords.has(token))
  ).slice(0, 12);
}

export function buildPracticeMetadata(word: VocabularyWord): PracticeMetadata {
  const lemma = normalizePracticeText(word.word).split(/[\s,(]/)[0] || word.word;

  return {
    lemma,
    wordForms: deriveForms(lemma),
    partOfSpeech: undefined,
    collocations: [],
    semanticTags: unique([word.category ?? ''].map(normalizePracticeText)),
    semanticKeywords: extractKeywords(word.meaning, word.example, word.category),
    minimumSentenceLength: 5,
  };
}

export const defaultPracticeRules: PracticeRuleConfig[] = [
  { id: 'target-word-exists', label: 'Use the target word', enabled: true, required: true, weight: 30 },
  { id: 'correct-word-form', label: 'Use an accepted word form', enabled: true, required: true, weight: 15 },
  { id: 'complete-sentence', label: 'Write a complete sentence', enabled: true, required: true, weight: 15 },
  { id: 'minimum-length', label: 'Make the sentence long enough', enabled: true, required: true, weight: 10 },
  { id: 'basic-grammar', label: 'Pass basic grammar checks', enabled: true, weight: 15 },
  { id: 'semantic-match', label: 'Stay close to the word meaning', enabled: true, weight: 10 },
  { id: 'collocation-bonus', label: 'Use a common collocation', enabled: true, bonus: true, weight: 5 },
];
