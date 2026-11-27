import { describe, it, expect } from 'vitest';
import { cleanSpeechText, prepareTextForSpeech } from '../src/utils/speech/core/speechText';

// Current intended behaviour: IPA, (pos) and [labels] are stripped, list numbers are
// kept so they are read aloud, and a trailing full stop is added for a natural pause.
const cases: Array<{ input: string; output: string }> = [
  {
    input: '/ˈækt/ (verb) [C] 1. to do something',
    output: '1. to do something.',
  },
  {
    input: '1. word 2. meaning',
    output: '1. word 2. meaning.',
  },
  {
    input: '[formal] (noun) /təˈmeɪtoʊ/ tomato',
    output: 'tomato.',
  },
  {
    input: '/ən/ (adv.) quickly',
    output: 'quickly.',
  },
  {
    input: 'Meaning: 1. do X 2. do Y',
    output: 'Meaning: 1. do X 2. do Y.',
  },
];

describe('cleanSpeechText', () => {
  cases.forEach(({ input, output }) => {
    it(`cleans "${input}"`, () => {
      expect(cleanSpeechText(input)).toBe(output);
    });
  });

  it('handles empty or non-string values', () => {
    // @ts-expect-error testing runtime fallback
    expect(cleanSpeechText(undefined)).toBe('');
    // @ts-expect-error testing runtime fallback
    expect(cleanSpeechText(null)).toBe('');
    expect(cleanSpeechText('')).toBe('');
  });
});

describe('prepareTextForSpeech', () => {
  it('delegates to cleanSpeechText', () => {
    const input = '/ən/ [slang] 1. run';
    expect(prepareTextForSpeech(input)).toBe('1. run.');
  });
});
