// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { tokenize, tapSelect, dragSelect, selectionPhrase, sentenceFor, type Selection } from '@/features/scan-text/selection';
import { lookupMeaning, lookupLocal, registerMeaningProvider, type MeaningProvider } from '@/features/scan-text/meaning';
import { createEnglishDictionaryProvider, englishLemmaCandidates, englishPhraseCandidates } from '@/features/scan-text/englishDictionary';
import { getLanguageProfile, registerLanguageProfile, type LanguageProfile } from '@/features/scan-text/languages';
import { planTranslation, type TranslationAdapter } from '@/features/scan-text/translation';
import { buildPrefill, performScan, translatePhrase } from '@/features/scan-text/scanFlow';
import { FREE_SCANS_PER_DAY, canScan, recordScan, scansToday } from '@/features/scan-text/dailyLimit';
import { ScanError, type ScanAdapter } from '@/features/scan-text/ocr';
import type { VocabularyWord } from '@/types/vocabulary';

const words = (...w: [string, string, Partial<VocabularyWord>?][]): VocabularyWord[] =>
  w.map(([word, meaning, x]) => ({ word, meaning, example: '', count: 0, category: 'topic vocab', ...x }));

const TEXT = 'The pond will dry up in summer. We dried up the cups!\n\nNew paragraph here.';
const at = (t: ReturnType<typeof tokenize>, w: string, nth = 0) => t.map((x, i) => [x, i] as const).filter(([x]) => x.text === w)[nth][1];

describe('[FB-66] selection -> phrase and sentence', () => {
  const tokens = tokenize(TEXT, 'en');
  it('[FB-66] tokenizes words vs spaces/punctuation', () => {
    expect(tokens.filter((t) => t.word).map((t) => t.text).slice(0, 4)).toEqual(['The', 'pond', 'will', 'dry']);
    expect(tokens.some((t) => !t.word && t.text.includes('.'))).toBe(true);
  });
  it('[FB-66] a tap selects one word; a second tap extends to a phrase; a third restarts', () => {
    const dry = at(tokens, 'dry'); const up = at(tokens, 'up');
    let s: Selection | null = tapSelect(tokens, null, dry);
    expect(selectionPhrase(TEXT, tokens, s)).toBe('dry');
    s = tapSelect(tokens, s, up);
    expect(selectionPhrase(TEXT, tokens, s)).toBe('dry up');
    s = tapSelect(tokens, s, at(tokens, 'pond'));
    expect(selectionPhrase(TEXT, tokens, s)).toBe('pond');
    expect(tapSelect(tokens, s, dry - 1)).toEqual(s); // tapping a space changes nothing
  });
  it('[FB-66] drag selects in either direction and ignores non-word targets', () => {
    const dry = at(tokens, 'dry'); const up = at(tokens, 'up');
    expect(selectionPhrase(TEXT, tokens, dragSelect(tokens, null, dry, up))).toBe('dry up');
    expect(selectionPhrase(TEXT, tokens, dragSelect(tokens, null, up, dry))).toBe('dry up');
    const s = dragSelect(tokens, null, dry, up);
    expect(dragSelect(tokens, s, dry, dry + 1)).toEqual(s);
  });
  it('[FB-66] the sentence containing the selection becomes the example; paragraphs are boundaries', () => {
    const s = tapSelect(tokens, null, at(tokens, 'dry'));
    expect(sentenceFor(TEXT, tokens, s, 'en')).toBe('The pond will dry up in summer.');
    const s2 = tapSelect(tokens, null, at(tokens, 'dried'));
    expect(sentenceFor(TEXT, tokens, s2, 'en')).toBe('We dried up the cups!');
    const s3 = tapSelect(tokens, null, at(tokens, 'paragraph'));
    expect(sentenceFor(TEXT, tokens, s3, 'en')).toBe('New paragraph here.');
    expect(sentenceFor(TEXT, tokens, null)).toBe('');
  });
  it('[FB-66] wrapped OCR lines are joined into one clean example', () => {
    const t = 'The river will\ndry up soon.';
    const tk = tokenize(t, 'en');
    expect(sentenceFor(t, tk, tapSelect(tk, null, at(tk, 'river')), 'en')).toBe('The river will dry up soon.');
  });
});

describe('[FB-66] meaning lookup through the provider interface', () => {
  const local = () => words(['To get around to /ˌɡet/', 'finally do something', { translation: 'xoay xở' }], ['dry up', 'become dry', { example: 'The well dried up.' }]);
  const res = (status: number, body?: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response;
  const entry = [{ phonetic: '/draɪ/', meanings: [{ definitions: [{ definition: 'free of moisture', example: 'a dry towel' }] }] }];

  it('[FB-66] the app’s own words win and carry IPA/category/translation, without any network call', async () => {
    const fetchImpl = vi.fn();
    const r = await lookupMeaning('get around to', { local, providers: [createEnglishDictionaryProvider(fetchImpl as never)] });
    expect(r).toMatchObject({ status: 'found', source: 'app', hit: { meaning: 'finally do something', ipa: '/ˌɡet/', translation: 'xoay xở', category: 'topic vocab' } });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(lookupLocal('nothing', local())).toBeNull();
  });
  it('[FB-66] English provider hit (Free Dictionary) fills meaning, example and IPA', async () => {
    const fetchImpl = vi.fn(async () => res(200, entry));
    const r = await lookupMeaning('dry', { local: () => [], providers: [createEnglishDictionaryProvider(fetchImpl as never)] });
    expect(r).toMatchObject({ status: 'found', source: 'free-dictionary-en', hit: { meaning: 'free of moisture', example: 'a dry towel', ipa: '/draɪ/' } });
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/entries/en/dry');
  });
  it('[FB-66] 404 -> not-found, nothing thrown', async () => {
    const r = await lookupMeaning('zzzzq', { local: () => [], providers: [createEnglishDictionaryProvider((async () => res(404)) as never)] });
    expect(r).toEqual({ status: 'not-found' });
  });
  it('[FB-66] offline (fetch rejects) -> offline', async () => {
    const r = await lookupMeaning('dry', { local: () => [], providers: [createEnglishDictionaryProvider((async () => { throw new TypeError('Failed to fetch'); }) as never)] });
    expect(r).toEqual({ status: 'offline' });
  });
  it('[FB-66] simple lemmatization retries: dried -> dry, running -> run, "dried up" -> "dry up"', async () => {
    expect(englishLemmaCandidates('dried')).toContain('dry');
    expect(englishLemmaCandidates('running')).toContain('run');
    expect(englishLemmaCandidates('making')).toContain('make');
    expect(englishLemmaCandidates('cups')).toContain('cup');
    expect(englishPhraseCandidates('dried up').slice(0, 2)).toEqual(['dried up', 'dry up']);
    const fetchImpl = vi.fn(async (u: string) => (u.endsWith('/dry') ? res(200, entry) : res(404)));
    const r = await lookupMeaning('dried', { local: () => [], providers: [createEnglishDictionaryProvider(fetchImpl as never)] });
    expect(r.status).toBe('found');
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
  });
  it('[FB-66] a server error is reported as error, not not-found', async () => {
    const r = await lookupMeaning('dry', { local: () => [], providers: [createEnglishDictionaryProvider((async () => res(500)) as never)] });
    expect(r).toEqual({ status: 'error' });
  });
});

describe('[FB-66] language-agnostic seams (stub non-English provider / OCR script)', () => {
  const FR: LanguageProfile = { code: 'fr', script: 'latin', meaningProviderIds: ['stub-fr'] };
  const stub: MeaningProvider = { id: 'stub-fr', language: 'fr', lookup: async (p) => ({ status: 'found', source: 'stub-fr', hit: { meaning: `sens de ${p}` } }) };
  const JA: LanguageProfile = { code: 'ja', script: 'japanese', meaningProviderIds: [] };
  beforeEach(() => { registerMeaningProvider(stub); registerLanguageProfile(FR); registerLanguageProfile(JA); localStorage.clear(); });

  it('[FB-66] the profile picks the provider: a stub French provider answers without touching the English one', async () => {
    const r = await lookupMeaning('chat', { profile: getLanguageProfile('fr'), local: () => [] });
    expect(r).toMatchObject({ status: 'found', source: 'stub-fr', hit: { meaning: 'sens de chat' } });
  });
  it('[FB-66] the OCR script comes from the profile (japanese) and is passed to the adapter; no language name in the flow', async () => {
    const recognize = vi.fn(async () => ({ text: 'こんにちは' }));
    const adapter: ScanAdapter = { isAvailable: async () => true, pickImage: async () => ({ path: 'x' }), recognize };
    const r = await performScan({ source: 'gallery', unlimited: true, profile: getLanguageProfile('ja'), adapter });
    expect(r.status).toBe('ok');
    expect(recognize).toHaveBeenCalledWith({ path: 'x' }, 'japanese');
  });
  it('[FB-66] scripts without spaces still tokenize into tappable words', () => {
    expect(tokenize('私は学生です', 'ja').some((t) => t.word)).toBe(true);
  });
  it('[FB-66] source language comes from the profile: a French source on an English device translates fr -> en', () => {
    expect(planTranslation({ source: 'fr', device: 'en-US', showDefault: true })).toEqual({ action: 'translate', from: 'fr', to: 'en' });
  });
  it('[FB-66] prefill uses the profile (no English assumptions) and keeps the example from the sentence', async () => {
    const p = await buildPrefill({ phrase: 'chat', example: 'Le chat dort.', profile: getLanguageProfile('fr'), local: () => [], plan: { device: 'fr', showDefault: true } });
    expect(p.form).toMatchObject({ word: 'chat', meaning: 'sens de chat', example: 'Le chat dort.' });
  });
});

describe('[FB-66] prefill', () => {
  it('[FB-66] IPA from the app word is appended in the existing word shape; category is canonical; example = sentence', async () => {
    const local = () => words(['dry up /draɪ ʌp/', 'become dry', { category: 'Phrasal Verbs', example: 'bundle example' }]);
    const p = await buildPrefill({ phrase: 'dry up', example: 'The pond will dry up.', local, plan: { device: 'en-US' } });
    expect(p.form).toMatchObject({ word: 'dry up /draɪ ʌp/', meaning: 'become dry', category: 'phrasal verbs', example: 'The pond will dry up.' });
  });
  it('[FB-66] a miss leaves meaning empty (editable) and category on the default', async () => {
    const p = await buildPrefill({ phrase: 'qqq', example: '', local: () => [], providers: [], plan: { device: 'en-US' } });
    expect(p.meaning.status).toBe('not-found');
    expect(p.form).toMatchObject({ word: 'qqq', meaning: '', category: 'topic vocab', translation: '' });
  });
});

describe('[FB-66] translation rule and flow', () => {
  const adapter = (over: Partial<TranslationAdapter> = {}): TranslationAdapter => ({
    isAvailable: async () => true, isModelDownloaded: async () => true, downloadModel: vi.fn(async () => {}), translate: vi.fn(async (t) => `vi:${t}`), ...over,
  });
  it('[FB-66] skipped when the device language equals the source language (en device, en source)', () => {
    expect(planTranslation({ source: 'en', device: 'en-US' })).toEqual({ action: 'skip', reason: 'same-language' });
    expect(planTranslation({ source: 'en', device: 'en' })).toEqual({ action: 'skip', reason: 'same-language' });
  });
  it('[FB-66] Vietnamese device translates; non-Vietnamese device respects the VI toggle (FB-42/FB-64)', () => {
    expect(planTranslation({ source: 'en', device: 'vi-VN', showDefault: true })).toEqual({ action: 'translate', from: 'en', to: 'vi' });
    expect(planTranslation({ source: 'en', device: 'fr-FR', showDefault: false })).toEqual({ action: 'skip', reason: 'hidden' });
    expect(planTranslation({ source: 'en', device: 'fr-FR', showDefault: true })).toEqual({ action: 'translate', from: 'en', to: 'fr' });
  });
  it('[FB-66] same-language never touches the adapter', async () => {
    const a = adapter();
    expect(await translatePhrase({ phrase: 'dry', plan: { device: 'en-US' }, adapter: a })).toEqual({ status: 'skipped', reason: 'same-language' });
    expect(a.translate).not.toHaveBeenCalled();
  });
  it('[FB-66] models present: translate directly; missing: ask first, decline -> declined, accept -> download then translate', async () => {
    expect(await translatePhrase({ phrase: 'dry', plan: { device: 'vi', showDefault: true }, adapter: adapter() })).toEqual({ status: 'ok', text: 'vi:dry' });
    const a = adapter({ isModelDownloaded: async () => false });
    expect(await translatePhrase({ phrase: 'dry', plan: { device: 'vi', showDefault: true }, adapter: a })).toEqual({ status: 'declined' });
    expect(a.downloadModel).not.toHaveBeenCalled();
    const onDownloading = vi.fn();
    const r = await translatePhrase({ phrase: 'dry', plan: { device: 'vi', showDefault: true }, adapter: a, confirmDownload: async () => true, onDownloading });
    expect(r).toEqual({ status: 'ok', text: 'vi:dry' });
    expect(a.downloadModel).toHaveBeenCalledTimes(2);
    expect(onDownloading).toHaveBeenCalled();
  });
  it('[FB-66] failure and a missing adapter never throw (field stays editable)', async () => {
    const bad = adapter({ translate: async () => { throw new Error('boom'); } });
    expect(await translatePhrase({ phrase: 'dry', plan: { device: 'vi', showDefault: true }, adapter: bad })).toEqual({ status: 'failed' });
    expect(await translatePhrase({ phrase: 'dry', plan: { device: 'vi', showDefault: true }, adapter: null })).toEqual({ status: 'unavailable' });
  });
});

describe('[FB-66] daily scan limit', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());
  const ok: ScanAdapter = { isAvailable: async () => true, pickImage: async () => ({ path: 'p' }), recognize: async () => ({ text: 'hello world' }) };

  it('[FB-66] free: scans 1-5 allowed, the 6th is blocked; Pro is unlimited', async () => {
    for (let i = 1; i <= FREE_SCANS_PER_DAY; i++) expect((await performScan({ source: 'camera', unlimited: false, adapter: ok })).status).toBe('ok');
    expect(scansToday()).toBe(5);
    expect(canScan(false)).toBe(false);
    expect((await performScan({ source: 'camera', unlimited: false, adapter: ok })).status).toBe('blocked');
    expect((await performScan({ source: 'camera', unlimited: true, adapter: ok })).status).toBe('ok');
  });
  it('[FB-66] a cancelled camera, empty OCR and a failure do not count', async () => {
    expect((await performScan({ source: 'camera', unlimited: false, adapter: { ...ok, pickImage: async () => null } })).status).toBe('cancelled');
    expect((await performScan({ source: 'camera', unlimited: false, adapter: { ...ok, recognize: async () => ({ text: '  ' }) } })).status).toBe('empty');
    expect((await performScan({ source: 'camera', unlimited: false, adapter: { ...ok, recognize: async () => { throw new ScanError('failed', 'x'); } } })).status).toBe('failed');
    expect(scansToday()).toBe(0);
  });
  it('[FB-66] an unavailable adapter (web) is reported and not counted', async () => {
    expect((await performScan({ source: 'camera', unlimited: false, adapter: { ...ok, isAvailable: async () => false } })).status).toBe('unavailable');
    expect(scansToday()).toBe(0);
  });
  it('[FB-66] the day is the device-local date: the count resets after local midnight', () => {
    const d1 = new Date(2026, 10, 27, 23, 59);
    const d2 = new Date(2026, 10, 28, 0, 1);
    for (let i = 0; i < 5; i++) recordScan(d1);
    expect(canScan(false, d1)).toBe(false);
    expect(canScan(false, d2)).toBe(true);
    expect(scansToday(d2)).toBe(0);
  });
  it('[FB-66] unreadable storage counts as zero scans', () => {
    localStorage.setItem('lazyVoca.scan.daily.v1', '{not json');
    expect(scansToday()).toBe(0);
  });
});
