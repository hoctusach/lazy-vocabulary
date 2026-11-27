// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildNativeQueue, effectiveTranslation } from '@/services/background/buildNativeQueue';
import { setShowDefaultVi } from '@/lib/translations/showDefaultVi';
import { setTranslationOverride } from '@/lib/translations/translationOverrides';

const J = 'android/app/src/main/java/com/lazy/vocabulary/';
const svc = readFileSync(join(process.cwd(), J + 'PlaybackService.java'), 'utf8');
const KIND = { CATEGORY: '0', MEANING: '1', EXAMPLE: '2', TRANSLATION: '3' };

let out = '';
let hasJava = true;
beforeAll(() => {
  try {
    out = mkdtempSync(join(tmpdir(), 'nb-'));
    execFileSync('javac', ['-d', out, join(process.cwd(), J + 'NotificationBody.java'), join(process.cwd(), 'tests/regression/java/NotificationBodyCheck.java')]);
  } catch {
    hasJava = false;
  }
});
const body = (...f: string[]) =>
  execFileSync('java', ['-cp', out, 'com.lazy.vocabulary.NotificationBodyCheck', ...f], { encoding: 'utf8' })
    .split('\n').filter(Boolean).map((l) => { const i = l.indexOf('|'); return [l.slice(0, i), l.slice(i + 1)]; });

describe('[FB-65] notification body builder (real Java helper)', () => {
  it('javac is available (the builder is tested by running it)', () => expect(hasJava).toBe(true));

  it('order = category, meaning, example, translation (card order; word is the title)', () => {
    expect(body('Phrasal Verb', 'to become dry', 'The well dried up.', 'cạn kiệt')).toEqual([
      [KIND.CATEGORY, 'Phrasal Verb'],
      [KIND.MEANING, 'to become dry'],
      [KIND.EXAMPLE, '“The well dried up.”'],
      [KIND.TRANSLATION, 'cạn kiệt'],
    ]);
  });

  it('meaning and translation get the italic kind, example is quoted, category has its own dim kind', () => {
    const kinds = body('Idiom', 'm', 'e', 't').map((l) => l[0]);
    expect(kinds).toEqual([KIND.CATEGORY, KIND.MEANING, KIND.EXAMPLE, KIND.TRANSLATION]);
    expect(new Set(kinds).size).toBe(4);
  });

  it('empty / blank fields are omitted (no blank lines)', () => {
    expect(body('', 'm', '  ', '')).toEqual([[KIND.MEANING, 'm']]);
    expect(body('Idiom', '', 'e', '')).toEqual([[KIND.CATEGORY, 'Idiom'], [KIND.EXAMPLE, '“e”']]);
    expect(body('', '', '', '')).toEqual([]);
  });

  it('service applies italic to meaning/translation, dim+small to category, stays BigTextStyle (never MediaStyle)', () => {
    const big = svc.slice(svc.indexOf('private CharSequence bigText()'), svc.indexOf('private Notification buildNotification()'));
    expect(big).toContain('NotificationBody.lines(');
    expect(big).toMatch(/MEANING \|\| l\.kind == NotificationBody\.TRANSLATION[\s\S]*StyleSpan\(android\.graphics\.Typeface\.ITALIC\)/);
    expect(big).toMatch(/CATEGORY[\s\S]*RelativeSizeSpan[\s\S]*ForegroundColorSpan/);
    expect(svc).toContain('new NotificationCompat.BigTextStyle()');
    expect(svc).not.toMatch(/MediaStyle|MediaSession/);
  });
});

describe('[FB-65] translation visibility in the native queue (FB-42 / FB-64)', () => {
  const w = { word: 'dry up', meaning: 'm', example: 'e', translation: 'cạn', category: 'phrasal verbs', count: 0 };
  const q = () => buildNativeQueue([w], w, { rate: 1, muted: false })!.items[0];
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true });
    Object.defineProperty(window.navigator, 'languages', { value: ['en-US'], configurable: true });
  });

  it('English device, toggle off, no override: default translation is NOT sent', () => {
    expect(q().translation).toBe('');
  });
  it('English device, toggle on: default translation is sent', () => {
    setShowDefaultVi(true);
    expect(q().translation).toBe('cạn');
  });
  it('user override is always sent, even with the toggle off', () => {
    setTranslationOverride({ word: w.word, category: w.category }, 'my own');
    expect(q().translation).toBe('my own');
    expect(effectiveTranslation(w, false)).toBe('my own');
  });
  it('category label matches the card pill', () => {
    expect(q().categoryLabel).toBe('Phrasal Verb');
  });
  it('Vietnamese device shows the default translation', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'vi-VN', configurable: true });
    Object.defineProperty(window.navigator, 'languages', { value: ['vi-VN'], configurable: true });
    expect(q().translation).toBe('cạn');
  });
});
