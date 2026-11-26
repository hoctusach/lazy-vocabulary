import { describe, expect, it } from 'vitest';
import { BLOCKED_NICKNAME_CHARS_HELP, toCanonical, validateDisplayName } from '@/lib/nickname';
import { sanitizeNickname } from '@/services/nicknameService';

describe('nickname validation (A1, A2, A4)', () => {
  it('needs 3 to 40 characters after trimming', () => {
    expect(validateDisplayName('ab')).toBe('Nickname must be at least 3 characters.');
    expect(validateDisplayName('  ab  ')).toBe('Nickname must be at least 3 characters.');
    expect(validateDisplayName('abc')).toBeNull();
    expect(validateDisplayName('a'.repeat(40))).toBeNull();
    expect(validateDisplayName('a'.repeat(41))).toBe('Nickname must be at most 40 characters.');
  });

  it.each(['a<b', 'a>b', 'a"b', "a'b", 'a`b', 'a$b', 'a\\b', 'a{b', 'a}b', 'a|b', 'a;b', 'a(b', 'a)b', 'a[b', 'a]b', '(((', 'ab\u0000c', 'ab\nc'])(
    'blocks %j',
    (name) => expect(validateDisplayName(name)).toBe('Nickname contains blocked characters.')
  );

  it.each(['Mi mi U', 'Nguyễn Văn A', '你好吗', 'ผม ชื่อ', 'مرحبا', '😀😀😀', 'user_01', 'a-b-c'])('accepts %s', (name) =>
    expect(validateDisplayName(name)).toBeNull()
  );
});

describe('canonical form (A5, A6)', () => {
  it('ignores case, spaces and full-width letters', () => {
    for (const name of ['Mi mi U', 'MIMIU', 'mimiu', ' m i m i u ', 'ＭＩＭＩＵ']) expect(toCanonical(name)).toBe('mimiu');
  });

  it('keeps different names apart', () => {
    expect(toCanonical('mimiu')).not.toBe(toCanonical('mimiu2'));
  });

  it('treats zero-width and other invisible format characters like nothing (A6)', () => {
    expect(toCanonical('mi\u200Bmiu')).toBe('mimiu');
    expect(toCanonical('mimiu\uFEFF')).toBe('mimiu');
    expect(toCanonical('mi\u2060mi\u200Cu')).toBe('mimiu');
  });

  it('keeps emoji and other letters (only invisible format characters are dropped)', () => {
    expect(toCanonical('😀 Nguyễn')).toBe('😀nguyễn');
  });
});

describe('sanitizeNickname and validateDisplayName use the same rule (A3)', () => {
  it('a name that passes validation is not changed by sanitizing', () => {
    for (const name of ['Mi mi U', 'Nguyễn Văn A', '你好吗', 'user_01', 'a-b-c', '😀😀😀']) {
      expect(validateDisplayName(name)).toBeNull();
      expect(sanitizeNickname(name)).toBe(name);
    }
  });

  it('a name that would have been changed silently is now rejected', () => {
    for (const name of ['(((', '[[[', 'a(b)', 'Mi (mi)']) {
      expect(validateDisplayName(name)).toBe('Nickname contains blocked characters.');
    }
  });

  it('sanitizing still removes blocked characters and trims, as a safety net', () => {
    expect(sanitizeNickname('  Mi (mi) ')).toBe('Mi mi');
    expect(sanitizeNickname('a[b]c')).toBe('abc');
  });

  it('the help text lists every blocked character', () => {
    for (const ch of ['<', '>', '"', "'", '`', '$', '(', ')', '[', ']', '{', '}', '|', ';', '\\']) {
      expect(BLOCKED_NICKNAME_CHARS_HELP).toContain(ch);
    }
  });
});
