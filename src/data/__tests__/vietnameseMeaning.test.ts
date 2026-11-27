import { describe, expect, it } from 'vitest';
import data from '../defaultVocabulary.json';

// Letters that only occur in Vietnamese (not in English words or IPA), incl. tone-marked vowels.
// ê/ô and plain é/è/à/á/ó/ò/ú/ù/í/ì/ý are left out: English loanwords (café, naïve) use them.
const VI = /[ăâđơưĂÂĐƠƯảãạằắẳẵặầấẩẫậẻẽẹềếểễệỉĩịỏõọồốổỗộờớởỡợủũụừứửữựỳỷỹỵ]/;

describe('[FB-23] bundled vocabulary', () => {
  it('has no Vietnamese text in the English meaning field', () => {
    const bad: string[] = [];
    for (const [cat, items] of Object.entries(data as Record<string, { word: string; meaning?: string }[]>)) {
      for (const e of items) {
        if (VI.test(e.meaning ?? '')) bad.push(`${cat}: ${e.word}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
