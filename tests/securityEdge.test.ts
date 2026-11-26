import { describe, expect, it, vi } from 'vitest';
import { sanitizeInput } from '@/utils/security/sanitization';

vi.spyOn(console, 'log').mockImplementation(() => undefined);

describe('ordinary text must survive (M2)', () => {
  it.each([
    'Please select the best option',
    'to drop out of school',
    'a union of two countries',
    "Don't insert it here",
    'create a table of contents',
  ])('keeps %j unchanged', (text) => {
    expect(sanitizeInput(text)).toBe(text);
  });

  // Known issue: the SQL pattern "UPDATE ... SET" also matches normal English sentences.
  it.fails('keeps a sentence with "update" and "set"', () => {
    const text = 'Update your profile and set a goal';
    expect(sanitizeInput(text)).toBe(text);
  });

  // Known issue: the keyword EXEC is removed even when it is the English word "exec".
  it.fails('keeps the word "exec"', () => {
    expect(sanitizeInput('the exec team')).toBe('the exec team');
  });
});

describe('attacks are removed (M1, M4, M5)', () => {
  it.each([
    ['<script>alert(1)</script>hello', 'hello'],
    ['click javascript:alert(1)', 'click alert(1)'],
    ['hi <iframe src=x></iframe>', 'hi </iframe>'],
    ['a<!-- hidden -->b', 'ab'],
  ])('%j', (input, expected) => {
    expect(sanitizeInput(input)).toBe(expected);
  });

  it('removes null bytes and control characters but keeps letters', () => {
    expect(sanitizeInput('a\u0000b\u0007c')).toBe('abc');
  });

  it('keeps known HTML entities, removes unknown ones', () => {
    expect(sanitizeInput('a &amp; b')).toBe('a &amp; b');
    expect(sanitizeInput('a &weird; b')).toBe('a b');
  });

  it('keeps IPA, Vietnamese and brackets (M3)', () => {
    for (const text of ['/ˈfɒnɪk/ (noun)', 'đường phố', '[formal] spare']) expect(sanitizeInput(text)).toBe(text);
  });

  it('returns an empty string for non-string input', () => {
    expect(sanitizeInput(undefined as unknown as string)).toBe('');
    expect(sanitizeInput(null as unknown as string)).toBe('');
    expect(sanitizeInput(42 as unknown as string)).toBe('');
  });
});

describe('performance (M6)', () => {
  it('handles 200,000 characters quickly, including pathological input', () => {
    const big = 'a'.repeat(200_000);
    const nasty = `<script ${'a '.repeat(20_000)}`;
    const start = Date.now();
    sanitizeInput(big);
    sanitizeInput(nasty);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
