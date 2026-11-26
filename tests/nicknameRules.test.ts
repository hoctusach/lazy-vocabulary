import { describe, expect, it } from 'vitest';
import { toCanonical, validateDisplayName } from '@/lib/nickname';
import { sanitizeNickname } from '@/services/nicknameService';

describe('nickname validation (A1, A2, A4)', () => {
  it('needs 3 to 40 characters after trimming', () => {
    expect(validateDisplayName('ab')).toBe('Nickname must be at least 3 characters.');
    expect(validateDisplayName('  ab  ')).toBe('Nickname must be at least 3 characters.');
    expect(validateDisplayName('abc')).toBeNull();
    expect(validateDisplayName('a'.repeat(40))).toBeNull();
    expect(validateDisplayName('a'.repeat(41))).toBe('Nickname must be at most 40 characters.');
  });

  it.each(['a<b', 'a>b', 'a"b', "a'b", 'a`b', 'a$b', 'a\\b', 'a{b', 'a}b', 'a|b', 'a;b', 'ab\u0000c', 'ab\nc'])(
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

  // Known bug: zero-width characters are not removed, so a look-alike name becomes a different account.
  it.fails('treats zero-width characters like nothing', () => {
    expect(toCanonical('mi​miu')).toBe('mimiu');
    expect(toCanonical('mimiu﻿')).toBe('mimiu');
  });
});

describe('sanitizeNickname vs validateDisplayName (A3)', () => {
  it('removes the characters it blocks and trims', () => {
    expect(sanitizeNickname('  Mi (mi) ')).toBe('Mi mi');
    expect(sanitizeNickname('a[b]c')).toBe('abc');
  });

  // Known bug: validation accepts these names but sanitizing turns them into something too short or empty.
  it.fails('a name that passes validation is still valid after sanitizing', () => {
    for (const name of ['(((', '[[[', 'a(b)']) {
      expect(validateDisplayName(name)).toBeNull();
      expect(validateDisplayName(sanitizeNickname(name))).toBeNull();
    }
  });
});
