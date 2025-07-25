import { describe, it, expect } from 'vitest';
import parseWordAnnotations from '../src/utils/text/parseWordAnnotations';

describe('parseWordAnnotations', () => {
  it('extracts bracketed tags', () => {
    const { main, annotations } = parseWordAnnotations('count on [transitive]');
    expect(main).toBe('count on');
    expect(annotations).toEqual(['[transitive]']);
  });

  it('extracts phonetics in parentheses', () => {
    const { main, annotations } = parseWordAnnotations('add up (/æd ʌp tə/)');
    expect(main).toBe('add up');
    expect(annotations).toEqual(['(/æd ʌp tə/)']);
  });

  it('handles multiple annotations', () => {
    const { main, annotations } = parseWordAnnotations('word (noun) /wɜːd/');
    expect(main).toBe('word');
    expect(annotations).toEqual(['(noun)', '/wɜːd/']);
  });
});
