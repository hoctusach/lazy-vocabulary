import { describe, expect, it } from 'vitest';
import { validateSetName, validateWordInput } from '@/features/word-sets/wordValidation';

describe('validateWordInput', () => {
  it('requires word and meaning', () => {
    const result = validateWordInput({ word: '  ', meaning: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.word).toBeDefined();
      expect(result.errors.meaning).toBeDefined();
    }
  });

  it('trims, defaults the category and keeps any language in translation', () => {
    for (const translation of ['bỏ cuộc', 'ยอมแพ้', 'استسلام', '放弃', '포기하다', 'сдаваться']) {
      const result = validateWordInput({ word: ' give up ', meaning: 'stop', translation });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.word).toBe('give up');
        expect(result.value.category).toBe('imported');
        expect(result.value.translation).toBe(translation);
      }
    }
  });

  it('rejects HTML, over-long fields and duplicates', () => {
    expect(validateWordInput({ word: '<script>x</script>', meaning: 'm' }).ok).toBe(false);
    expect(validateWordInput({ word: 'a'.repeat(101), meaning: 'm' }).ok).toBe(false);
    const existing = [{ word: 'Spare', meaning: 'x', example: '', count: 0, category: 'imported' }];
    const dup = validateWordInput({ word: 'spare', meaning: 'm' }, existing);
    expect(dup.ok).toBe(false);
  });

  it('strips control and zero-width characters', () => {
    const result = validateWordInput({ word: 'hel\u0000lo​', meaning: 'm' });
    expect(result.ok && result.value.word).toBe('hello');
  });
});

describe('validateSetName', () => {
  it('rejects blank, long, markup and duplicate names', () => {
    expect(validateSetName('  ')).not.toBeNull();
    expect(validateSetName('x'.repeat(61))).not.toBeNull();
    expect(validateSetName('<b>x</b>')).not.toBeNull();
    expect(validateSetName('My Set', ['my set'])).not.toBeNull();
    expect(validateSetName('My Set', ['Other'])).toBeNull();
  });
});
