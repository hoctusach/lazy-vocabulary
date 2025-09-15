import { describe, expect, it } from 'vitest';
import { toCanonical, validateDisplayName } from '../src/lib/nickname';

describe('nickname helpers', () => {
  it('canonicalizes case and whitespace', () => {
    expect(toCanonical('Mi mi U')).toBe('mimiu');
    expect(toCanonical('MIMIU')).toBe('mimiu');
  });

  it('validates blocked characters', () => {
    expect(validateDisplayName('valid name')).toBeNull();
    expect(validateDisplayName('bad$name')).toBe('Nickname contains blocked characters.');
  });
});
