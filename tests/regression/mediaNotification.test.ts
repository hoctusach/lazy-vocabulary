// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
const J = 'android/app/src/main/java/com/lazy/vocabulary/';

// [FB-49] Lock screen + notification shade media card. Real device behavior is proxy/manual (see catalog);
// these assert the wiring that produces it.
describe('[FB-49] native media notification + session', () => {
  const svc = read(J + 'PlaybackService.java');
  const plugin = read(J + 'PlaybackServicePlugin.java');

  it('MediaStyle notification bound to an active MediaSession, public on the lock screen', () => {
    expect(svc).toContain('Notification.MediaStyle');
    expect(svc).toContain('setMediaSession(');
    expect(svc).toContain('new MediaSession(');
    expect(svc).toContain('VISIBILITY_PUBLIC');
    expect(svc).toContain('FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK');
  });

  it('notification actions include Play AND Pause (state dependent) and Next', () => {
    expect(svc).toMatch(/"Pause", servicePi\(ACTION_PAUSE/);
    expect(svc).toMatch(/"Play", servicePi\(ACTION_PLAY/);
    expect(svc).toMatch(/"Next", servicePi\(ACTION_NEXT/);
    expect(svc).toContain('static final String ACTION_PLAY');
  });

  it('now-playing metadata: title = word, artist/subtitle = meaning, app name as album', () => {
    expect(svc).toContain('new MediaMetadata.Builder()');
    expect(svc).toContain('METADATA_KEY_TITLE, title');
    expect(svc).toContain('METADATA_KEY_ARTIST, text');
    expect(svc).toContain('METADATA_KEY_ALBUM, "Lazy Vocabulary"');
  });

  it('playback state flips PLAYING <-> PAUSED and the session accepts play/pause/next', () => {
    expect(svc).toMatch(/playing \? PlaybackState\.STATE_PLAYING : PlaybackState\.STATE_PAUSED/);
    expect(svc).toContain('ACTION_PLAY | PlaybackState.ACTION_PAUSE');
    expect(svc).toMatch(/onPlay\(\)[^}]*emitAction\("play"\)/);
    expect(svc).toMatch(/onPause\(\)[^}]*emitAction\("pause"\)/);
    expect(svc).toMatch(/onSkipToNext\(\)[^}]*emitAction\("next"\)/);
  });

  it('pause / play / next notification intents are handled and forwarded to JS', () => {
    expect(svc).toMatch(/ACTION_PAUSE\.equals\(action\) \|\| ACTION_PLAY\.equals\(action\) \|\| ACTION_NEXT\.equals\(action\)/);
    expect(svc).toMatch(/ACTION_PAUSE\.equals\(action\) \? "pause" : ACTION_PLAY\.equals\(action\) \? "play" : "next"/);
  });

  it('JS -> service: word, meaning and playing flag reach the service (start + direct update)', () => {
    expect(plugin).toContain('call.getString("title")');
    expect(plugin).toContain('call.getBoolean("playing", true)');
    expect(plugin).toContain('PlaybackService.applyState(');
    expect(svc).toContain('static void applyState(');
  });

  it('a paused player keeps the foreground card (wake lock released) and the service survives the screen turning off', () => {
    expect(svc).toMatch(/if \(playing\) acquireWakeLock\(\); else releaseWakeLock\(\)/);
    expect(svc).toContain('START_STICKY');
    expect(read(J + 'MainActivity.java')).toContain('keepWebViewRunningIfPlaying');
  });
});

describe('[FB-49] JS side', () => {
  beforeEach(() => vi.resetModules());

  it('hook and bridge are never driven by visibility/pagehide, and pause keeps the card', () => {
    const hook = read('src/hooks/usePlaybackService.ts');
    expect(hook).not.toMatch(/visibilitychange|pagehide|blur/);
    expect(hook).toContain('playing: false');
    expect(read('src/services/background/playbackService.ts')).toMatch(/action === 'play'\) handlers\?\.onPlay/);
  });

  it('web Media Session API mirrors metadata and handlers in addition to the native session', async () => {
    const handlers: Record<string, () => void> = {};
    const ms = { metadata: null as unknown, playbackState: 'none', setActionHandler: (a: string, f: () => void) => { handlers[a] = f; } };
    Object.defineProperty(navigator, 'mediaSession', { value: ms, configurable: true });
    (globalThis as unknown as { MediaMetadata: unknown }).MediaMetadata = class { constructor(public init: unknown) {} };
    const mod = await import('@/services/background/playbackService');
    const calls: string[] = [];
    mod.setPlaybackHandlers({ onPlay: () => calls.push('play'), onPause: () => calls.push('pause'), onNext: () => calls.push('next') });
    mod.syncWebMediaSession({ title: 'give up', text: 'to stop trying', playing: false });
    expect((ms.metadata as { init: { title: string; artist: string } }).init).toMatchObject({ title: 'give up', artist: 'to stop trying' });
    expect(ms.playbackState).toBe('paused');
    handlers.play(); handlers.pause(); handlers.nexttrack();
    expect(calls).toEqual(['play', 'pause', 'next']);
    mod.syncWebMediaSession(null);
    expect(ms.playbackState).toBe('none');
  });
});
