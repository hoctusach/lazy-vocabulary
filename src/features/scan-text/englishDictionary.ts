import { registerMeaningProvider, type MeaningProvider, type MeaningResult } from './meaning';

/**
 * [FB-66] The English meaning provider: the Free Dictionary API (no key, no account). It serves English only; other
 * languages register their own provider. Simple inflections are retried through the English lemmatizer.
 */
export const FREE_DICTIONARY_EN_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

const IRREGULAR: Record<string, string> = {
  was: 'be', were: 'be', is: 'be', are: 'be', been: 'be', has: 'have', had: 'have', does: 'do', did: 'do', done: 'do',
  went: 'go', gone: 'go', got: 'get', made: 'make', took: 'take', taken: 'take', came: 'come', saw: 'see', seen: 'see',
  gave: 'give', given: 'give', found: 'find', thought: 'think', said: 'say', ran: 'run', knew: 'know', known: 'know',
};

/** Candidate base forms for one English word (excluding the word itself), most likely first. Deliberately simple. */
export function englishLemmaCandidates(raw: string): string[] {
  const w = raw.toLowerCase();
  const out: string[] = [];
  const add = (c: string) => { if (c.length >= 2 && c !== w && !out.includes(c)) out.push(c); };
  if (IRREGULAR[w]) add(IRREGULAR[w]);
  if (w.length > 4 && w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.length > 4 && w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.length > 4 && w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    if (/([^aeiou])\1$/.test(stem)) add(stem.slice(0, -1)); // running -> run
    add(stem);
    add(stem + 'e'); // making -> make
  }
  if (w.length > 3 && w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    if (/([^aeiou])\1$/.test(stem)) add(stem.slice(0, -1)); // stopped -> stop
    add(stem);
    add(w.slice(0, -1)); // liked -> like
  }
  if (w.length > 3 && /(ses|xes|zes|ches|shes)$/.test(w)) add(w.slice(0, -2));
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
  return out;
}

/** Phrases inflect on their first word ("dried up" -> "dry up"). */
export function englishPhraseCandidates(phrase: string): string[] {
  const parts = phrase.trim().split(/\s+/);
  const [first, ...rest] = parts;
  const lemmas = englishLemmaCandidates(first);
  return [phrase.trim(), ...lemmas.map((l) => [l, ...rest].join(' '))];
}

type Fetch = typeof fetch;

interface Entry { phonetic?: string; phonetics?: { text?: string }[]; meanings?: { definitions?: { definition?: string; example?: string }[] }[] }

function toHit(entries: Entry[]) {
  const defs = entries.flatMap((e) => e.meanings ?? []).flatMap((m) => m.definitions ?? []);
  const meaning = defs.find((d) => d.definition)?.definition;
  if (!meaning) return null;
  const example = defs.find((d) => d.example)?.example;
  const text = entries.map((e) => e.phonetic || e.phonetics?.find((p) => p.text)?.text).find(Boolean);
  const ipa = text ? `/${text.replace(/^\/|\/$/g, '')}/` : undefined;
  return { meaning, example, ipa };
}

export function createEnglishDictionaryProvider(fetchImpl: Fetch = (input, init) => fetch(input, init)): MeaningProvider {
  return {
    id: 'free-dictionary-en',
    language: 'en',
    async lookup(phrase, signal): Promise<MeaningResult> {
      let sawError = false;
      for (const candidate of englishPhraseCandidates(phrase)) {
        let res: Response;
        try {
          res = await fetchImpl(FREE_DICTIONARY_EN_URL + encodeURIComponent(candidate), { signal });
        } catch (e) {
          if ((e as { name?: string })?.name === 'AbortError') throw e;
          return { status: 'offline' };
        }
        if (res.status === 404) continue;
        if (!res.ok) { sawError = true; continue; }
        try {
          const hit = toHit((await res.json()) as Entry[]);
          if (hit) return { status: 'found', hit, source: 'free-dictionary-en' };
        } catch {
          sawError = true;
        }
      }
      return sawError ? { status: 'error' } : { status: 'not-found' };
    },
  };
}

registerMeaningProvider(createEnglishDictionaryProvider());
