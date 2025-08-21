import { describe, it, expect } from 'vitest';
import { normalizeQuery } from '@/utils/text/normalizeQuery';

describe('normalizeQuery', () => {
  it('strips IPA and POS annotations', () => {
    expect(normalizeQuery('end up /ˈend ʌp/ [intransitive]')).toBe('end up');
  });

  it('removes diacritics', () => {
    expect(normalizeQuery('café')).toBe('cafe');
  });

  it('trims punctuation', () => {
    expect(normalizeQuery('!hello!?')).toBe('hello');
  });

  it('collapses extra whitespace', () => {
    expect(normalizeQuery('  hello   world  ')).toBe('hello world');
  });

  it('handles mixed cases together', () => {
    expect(normalizeQuery('  HéLLo, WoRLD! /həˈloʊ/ [noun]  ')).toBe('HeLLo WoRLD');
  });
});
