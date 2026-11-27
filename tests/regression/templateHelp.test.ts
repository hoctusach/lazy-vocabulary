// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { BUILTIN_CATEGORY_NAMES, CATEGORY_HELP_LINES, SAMPLE_TEMPLATE_ROWS, buildSampleXlsx, buildSampleCsv } from '@/features/word-sets/sampleTemplate';
import { BUILTIN_GROUPS } from '@/features/word-sets/vocabularySetStore';
import { parseVocabularyImport } from '@/features/word-sets/parseVocabularyImport';

const SIX = ['topic vocab', 'phrasal verbs', 'idioms', 'grammar', 'phrases, collocations', 'word formation'];

describe('[FB-44][FB-60] import template documents valid category values', () => {
  it('the six exact built-in names match the real groups', () => {
    expect([...BUILTIN_CATEGORY_NAMES]).toEqual(SIX);
    expect([...BUILTIN_GROUPS].sort()).toEqual([...SIX].sort());
  });

  it('[FB-60] help is four short lines (no JSON, no "Template")', () => {
    expect(CATEGORY_HELP_LINES).toEqual([
      'Required columns: word, meaning',
      'Optional: example, translation, category',
      'Categories: topic vocab, phrasal verbs, idioms, grammar, phrases, collocations, word formation',
      'Other category names make their own group. Blank means imported.',
    ]);
    const all = CATEGORY_HELP_LINES.join(' ');
    expect(all).not.toMatch(/json|template/i);
  });

  it('XLSX template has a README sheet with the same notes', () => {
    const wb = XLSX.read(buildSampleXlsx(), { type: 'array' });
    expect(wb.SheetNames).toContain('README');
    const text = XLSX.utils.sheet_to_csv(wb.Sheets.README);
    for (const n of SIX) expect(text).toContain(n);
    expect(text).toMatch(/Other category names make their own group/);
  });

  it('help lines mention every name (used by the UI next to the template buttons)', () => {
    const t = CATEGORY_HELP_LINES.join(' ');
    for (const n of SIX) expect(t).toContain(n);
  });


  it('the documented sample still imports (help-only field/sheet ignored); a custom category stays its own group', () => {
    const j = parseVocabularyImport({ fileName: 'sample.json', text: JSON.stringify({ name: 'Sample set', words: SAMPLE_TEMPLATE_ROWS }) });
    expect(j.ok).toBe(true);
    if (!j.ok) return;
    expect(j.wordCount).toBe(3);
    expect(Object.keys(j.sheets).sort()).toEqual(['idioms', 'phrasal verbs', 'topic vocab']);

    const x = parseVocabularyImport({ fileName: 'sample.xlsx', data: buildSampleXlsx() } as never);
    expect(x.ok).toBe(true);
    if (x.ok) { expect(x.wordCount).toBe(3); expect(Object.keys(x.sheets)).not.toContain('README'); }

    const c = parseVocabularyImport({ fileName: 'c.csv', text: 'word,meaning,category\nfoo,bar,My Custom Group\nbaz,qux,\n' });
    expect(c.ok).toBe(true);
    if (c.ok) expect(Object.keys(c.sheets).sort()).toEqual(['My Custom Group', 'imported']);
    void buildSampleCsv;
  });
});
