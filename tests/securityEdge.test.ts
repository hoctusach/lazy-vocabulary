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

  it.each([
    'Update your profile and set a goal',
    'the exec team',
    'I like it; select the best one',
    'Finish this; update it later; then delete the old file',
    'He will execute the plan and drop the idea',
    'to set up a table for dinner',
    'create a table of contents; insert a page break',
    'Select all that apply',
  ])('keeps the ordinary sentence %j', (text) => {
    expect(sanitizeInput(text)).toBe(text);
  });
});

describe('SQL attack shapes are still removed (M1)', () => {
  it.each([
    ['x; DROP TABLE users', 'x; users'],
    ['SELECT * FROM users', 'users'],
    ["a' OR '1'='1", "a'1"],
    ['1 UNION SELECT password FROM users', '1 password FROM users'],
    ['INSERT INTO t VALUES (1)', 't VALUES (1)'],
    ["UPDATE users SET name = 'x'", "'x'"],
    ['DELETE FROM users', 'users'],
    ['EXEC xp_cmdshell', ''],
    ['exec(\'x\')', "'x')"],
  ])('%j', (input, expected) => {
    expect(sanitizeInput(input).trim()).toBe(expected.trim());
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
