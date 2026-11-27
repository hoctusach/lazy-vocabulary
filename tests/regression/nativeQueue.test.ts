// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildNativeQueue, findQueueIndex, NATIVE_PAUSE_MS } from '@/services/background/buildNativeQueue';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
const J = 'android/app/src/main/java/com/lazy/vocabulary/';
const svc = read(J + 'PlaybackService.java');
const plugin = read(J + 'PlaybackServicePlugin.java');
const act = read(J + 'MainActivity.java');

// Real screen-off multi-word playback on a phone is proxy/manual (catalog); these assert the wiring.
describe('[FB-52] native service owns the queue', () => {
  it('JS builds the queue (rotated to the current word, with voice config) and passes it to the plugin', () => {
    const list = ['a', 'b', 'c', 'd'].map((w) => ({ word: w, meaning: `m${w}`, example: `e${w}`, translation: '', category: 'idioms', count: 0 }));
    const q = buildNativeQueue(list, { word: 'c', category: 'idioms' }, { voiceName: 'Kokoro Heart (US female)', rate: 0.8, muted: false })!;
    expect(q.items.map((i) => i.word)).toEqual(['c', 'd', 'a', 'b']);
    expect(q.items[0]).toMatchObject({ meaning: 'mc', example: 'ec', category: 'idioms', pauseMs: NATIVE_PAUSE_MS });
    expect(q.engine).toBe('kokoro');
    expect(q.voice).toBe('af_heart');
    expect(buildNativeQueue(list, list[0], { voiceName: 'Google US English', rate: 0.8, muted: true })).toMatchObject({ engine: 'system', muted: true });
    expect(buildNativeQueue([], null, { rate: 1, muted: false })).toBeNull();
    expect(findQueueIndex(q.items, { word: 'a', category: 'idioms' })).toBe(2);
    const bridge = read('src/services/background/playbackService.ts');
    expect(bridge).toContain('Native.setQueue(queue)');
    expect(plugin).toContain('public void setQueue(PluginCall call)');
    expect(plugin).toContain('PlaybackService.setQueue(');
  });

  it('native schedules the next word with a Handler (no JS timer) and speaks via Kokoro / TextToSpeech directly', () => {
    expect(svc).toContain('new Handler(Looper.getMainLooper())');
    expect(svc).toMatch(/main\.postDelayed\(nextWord, pause\)/);
    expect(svc).toContain('KokoroEngine.get(');
    expect(svc).toContain('android.speech.tts.TextToSpeech');
    expect(svc).toMatch(/private void nativeAdvance\(\)[\s\S]*stepIndex\(1\)[\s\S]*speakCurrentNative\(\)/);
  });

  it('watchdog hands the queue to native when JS stops reporting words; hand-back syncs JS', () => {
    expect(svc).toMatch(/private void onWatchdog[\s\S]*nativeOwner = true/);
    expect(svc).toMatch(/private void doHandBack[\s\S]*emitState\(true\)/);
    expect(act).toMatch(/onPause\(\)[\s\S]*PlaybackService\.takeOver\(\)/);
    expect(act).toMatch(/onResume\(\)[\s\S]*PlaybackService\.handBack\(\)/);
    expect(plugin).toContain('notifyListeners("state"');
  });

  it('wake lock only while playing; released on pause / stop / destroy', () => {
    expect(svc).toMatch(/if \(playing && running\) acquireWakeLock\(\); else releaseWakeLock\(\)/);
    expect(svc).toMatch(/setPlayingNative\(boolean isPlaying\)[\s\S]*if \(!isPlaying\)[\s\S]*stopSpeechNow\(\)/);
    expect(svc).toMatch(/private void shutdown\(\)[\s\S]*releaseWakeLock\(\)[\s\S]*stopForeground\(true\)/);
    expect(svc).toMatch(/onDestroy\(\)[\s\S]*releaseWakeLock\(\)/);
  });

  it('muted queue stays silent but keeps the timing (FB-30)', () => {
    expect(svc).toMatch(/if \(queue\.muted\)[\s\S]*estimateMs\(it, false\)/);
  });

  it('JS hide/visibility never tears the native queue down (FB-01)', () => {
    for (const f of ['src/hooks/usePlaybackService.ts', 'src/services/background/playbackService.ts', 'src/services/background/buildNativeQueue.ts']) {
      expect(read(f)).not.toMatch(/visibilitychange|pagehide|addEventListener\(\s*['"]blur/);
    }
  });
});
