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

describe('normalizeQuery keeps letters of every script', () => {
  it('keeps CJK, Thai, Arabic and Cyrillic text', () => {
    expect(normalizeQuery('你好')).toBe('你好');
    expect(normalizeQuery('สวัสดี')).toBe('สวัสดี');
    expect(normalizeQuery('مرحبا')).toBe('مرحبا');
    expect(normalizeQuery('привет мир')).toBe('привет мир');
  });

  it('maps đ to d and removes Vietnamese accents', () => {
    expect(normalizeQuery('đường phố')).toBe('duong pho');
    expect(normalizeQuery('Đà Nẵng')).toBe('Da Nang');
  });

  it('still removes symbols and emoji', () => {
    expect(normalizeQuery('hi!! 😀 (x)')).toBe('hi');
  });
});
