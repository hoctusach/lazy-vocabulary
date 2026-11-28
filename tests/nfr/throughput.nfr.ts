// NFR-PERF-10: TTS queue building and notification update throughput with the native plugin mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = { update: 0, setQueue: 0, start: 0 };
vi.mock('@capacitor/core', async (orig) => ({
  ...(await orig<any>()),
  registerPlugin: () => ({
    setQueue: async () => { calls.setQueue++; }, start: async () => { calls.start++; }, update: async () => { calls.update++; },
    stop: async () => {}, requestNotificationPermission: async () => ({ granted: true }),
    addListener: async () => ({ remove: async () => {} }),
  }),
}));
vi.mock('@/lib/platform/platformKind', () => ({ isNativeAndroid: () => true, isNativeIOS: () => false, isNativeApp: () => true, isNativePlatform: () => true }));

import { check, timeMedian } from './util';

describe('NFR-PERF-10 TTS queue / notification throughput (mocked native)', () => {
  beforeEach(() => { calls.update = calls.setQueue = calls.start = 0; });

  it('[NFR-PERF-10] building the 200-word native queue from the full built-in list', async () => {
    const { buildNativeQueue, NATIVE_QUEUE_MAX } = await import('@/services/background/buildNativeQueue');
    const { DEFAULT_VOCABULARY_DATA } = await import('@/data/defaultVocabulary');
    const { flattenSheets } = await import('@/features/word-sets/vocabularySetStore');
    const list = flattenSheets(DEFAULT_VOCABULARY_DATA);
    const cur = list[Math.floor(list.length / 2)];
    let q: any;
    const ms = await timeMedian(() => { q = buildNativeQueue(list, cur, { voiceName: 'Kokoro Heart (US female)', rate: 0.8, muted: false }); }, 15);
    expect(q.items.length).toBe(NATIVE_QUEUE_MAX);
    expect(q.items[0].word).toBe(cur.word);
    check('NFR-PERF-10', 'build_queue_200_ms', ms);
  });

  it('[NFR-PERF-10] 2000 notification updates (word changes / play-pause) are dispatched without queueing delay', async () => {
    const svc = await import('@/services/background/playbackService');
    svc.__resetPlaybackServiceForTests();
    await svc.startPlaybackService({ title: 'w0', text: 'm0', playing: true, index: 0 });
    expect(calls.start).toBe(1);
    const N = 2000;
    const t = performance.now();
    for (let i = 1; i <= N; i++) await svc.updatePlaybackService({ title: `w${i}`, text: `meaning ${i}`, playing: i % 7 !== 0, index: i });
    const ms = performance.now() - t;
    expect(calls.update).toBe(N);
    check('NFR-PERF-10', 'updates_per_sec', N / (ms / 1000), { scale: false });
    check('NFR-PERF-10', 'update_total_ms_2000', ms);
  });

  it('[NFR-PERF-10] setQueue for a rapid series (50 voice/rate changes) all reach the plugin', async () => {
    const svc = await import('@/services/background/playbackService');
    const { buildNativeQueue } = await import('@/services/background/buildNativeQueue');
    const list = Array.from({ length: 300 }, (_, i) => ({ word: `w${i}`, meaning: 'm', example: 'e', translation: '', category: 'idioms', count: 0 }));
    const t = performance.now();
    for (let i = 0; i < 50; i++) await svc.setPlaybackQueue(buildNativeQueue(list, list[i], { voiceName: 'Kokoro Heart (US female)', rate: 0.5 + i / 100, muted: false })!);
    check('NFR-PERF-10', 'set_queue_x50_ms', performance.now() - t);
    expect(calls.setQueue).toBe(50);
  });
});
