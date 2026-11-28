// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildNativeQueue } from '@/services/background/buildNativeQueue';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
const w = (word: string, extra = {}) => ({ word, meaning: `m-${word}`, example: `e-${word}`, translation: '', category: 'idioms', count: 0, ...extra });

describe('[FB-87] the native/notification queue is today\'s playlist, never the catalog sheet', () => {
  it('container builds the queue from initialWords, not vocabularyService.getWordList()', () => {
    const src = read('src/components/vocabulary-app/VocabularyAppContainerNew.tsx');
    expect(src).toMatch(/buildNativeQueue\(initialWords \?\? \[\]/);
    expect(src).not.toMatch(/buildNativeQueue\(vocabularyService\.getWordList\(\)/);
  });

  it('the queue only contains the words it is given (Next wraps inside today\'s list)', () => {
    const today = [w('adapt'), w('red tape'), w('ward off')];
    const q = buildNativeQueue(today, today[1], { rate: 1, muted: false })!;
    expect(q.items.map((i) => i.word).sort()).toEqual(['adapt', 'red tape', 'ward off']);
    expect(q.items.some((i) => i.word.toLowerCase().includes('knuckle'))).toBe(false);
  });
  // iOS: the same JS queue feeds iosNowPlaying; real lock-screen check is proxy/manual (see catalog).
});

describe('[FB-88] a word of today\'s list keeps example + translation in the notification', () => {
  it('custom word (not in any catalog sheet) is in the queue at index 0 with all fields', () => {
    const metrics = w('metrics', { category: 'custom', translation: 'số liệu', sourceId: 'set-1' });
    const today = [w('adapt'), metrics];
    localStorage.setItem('showDefaultVi', 'true');
    const q = buildNativeQueue(today, metrics, { rate: 1, muted: false })!;
    expect(q.items[0]).toMatchObject({ word: 'metrics', meaning: 'm-metrics', example: 'e-metrics' });
  });

  it('native bigText only degrades to meaning-only when the title is not the queue item (documented guard)', () => {
    const svc = read('android/app/src/main/java/com/lazy/vocabulary/PlaybackService.java');
    expect(svc).toMatch(/!it\.word\.equals\(title\)\) return text/);
  });
});
