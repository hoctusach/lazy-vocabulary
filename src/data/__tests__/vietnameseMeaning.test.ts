import { describe, expect, it } from 'vitest';
import data from '../defaultVocabulary.json';

// Letters that only occur in Vietnamese (not in English words or IPA), incl. tone-marked vowels.
const VI = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/g;

describe('bundled vocabulary', () => {
  it('has no Vietnamese text in the English meaning field', () => {
    const bad: string[] = [];
    for (const [cat, items] of Object.entries(data as Record<string, { word: string; meaning?: string }[]>)) {
      for (const e of items) {
        if (((e.meaning ?? '').match(VI) ?? []).length >= 2) bad.push(`${cat}: ${e.word}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
