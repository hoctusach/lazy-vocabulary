import { describe, expect, it } from 'vitest';
import { buildSampleCsv, buildSampleJson, buildSampleXlsx } from '@/features/word-sets/sampleTemplate';
import { parseVocabularyImport } from '@/features/word-sets/parseVocabularyImport';

describe('sample templates', () => {
  it('list the possible categories and still import cleanly', () => {
    expect(buildSampleCsv()).toContain('phrasal verbs | idioms');
    const csv = parseVocabularyImport({ fileName: 't.csv', text: buildSampleCsv() });
    const json = parseVocabularyImport({ fileName: 't.json', text: buildSampleJson() });
    const xlsx = parseVocabularyImport({ fileName: 't.xlsx', data: buildSampleXlsx() });
    for (const result of [csv, json, xlsx]) {
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.wordCount).toBe(3);
    }
  });
});
