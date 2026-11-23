/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getTranslationOverride,
  resolveTranslation,
  setTranslationOverride,
} from '@/features/translation/translationOverrides';

beforeEach(() => localStorage.clear());

describe('resolveTranslation', () => {
  it('always prefers the learner value, any language', () => {
    expect(resolveTranslation({ override: 'ยอมแพ้', defaultValue: 'bỏ cuộc', builtinSet: true, deviceLang: 'en-US' })).toBe('ยอมแพ้');
  });
  it('shows the built-in default only on Vietnamese devices', () => {
    expect(resolveTranslation({ defaultValue: 'bỏ cuộc', builtinSet: true, deviceLang: 'vi-VN' })).toBe('bỏ cuộc');
    expect(resolveTranslation({ defaultValue: 'bỏ cuộc', builtinSet: true, deviceLang: 'en-US' })).toBe('');
  });
  it('shows an imported set translation on every device', () => {
    expect(resolveTranslation({ defaultValue: '放弃', builtinSet: false, deviceLang: 'en-US' })).toBe('放弃');
  });
});

describe('translation overrides', () => {
  it('saves unicode and clears on blank', () => {
    expect(setTranslationOverride('default', 'give up', 'idioms', '포기하다').ok).toBe(true);
    expect(getTranslationOverride('default', 'give up', 'idioms')).toBe('포기하다');
    setTranslationOverride('default', 'give up', 'idioms', '   ');
    expect(getTranslationOverride('default', 'give up', 'idioms')).toBe('');
  });
  it('rejects markup', () => {
    expect(setTranslationOverride('default', 'a', 'c', '<img src=x>').ok).toBe(false);
  });
});
