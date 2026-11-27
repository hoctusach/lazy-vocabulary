// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
const J = 'android/app/src/main/java/com/lazy/vocabulary/';

// [FB-49] lock-screen card, superseded by [FB-53]: a natural app notification (BigTextStyle), not a media widget.
// Real lock-screen look is proxy/manual (see catalog); these assert the wiring that produces it.
describe('[FB-49][FB-53] native notification', () => {
  const svc = read(J + 'PlaybackService.java');
  const plugin = read(J + 'PlaybackServicePlugin.java');

  it('[FB-53] BigTextStyle, public on the lock screen, no MediaStyle / MediaSession', () => {
    expect(svc).toContain('NotificationCompat.BigTextStyle');
    expect(svc).toContain('VISIBILITY_PUBLIC');
    expect(svc).not.toContain('MediaStyle');
    expect(svc).not.toContain('MediaSession');
    expect(svc).not.toContain('setMediaSession');
    expect(svc).toContain('FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK');
  });

  it('notification actions include Play AND Pause (state dependent) and Next', () => {
    expect(svc).toMatch(/"Pause", servicePi\(ACTION_PAUSE/);
    expect(svc).toMatch(/"Play", servicePi\(ACTION_PLAY/);
    expect(svc).toMatch(/"Next", servicePi\(ACTION_NEXT/);
    expect(svc).toContain('static final String ACTION_PLAY');
  });

  it('pause / play / next / stop intents are handled natively and forwarded to JS', () => {
    expect(svc).toMatch(/ACTION_PAUSE\.equals\(action\)[\s\S]*emitAction\("pause"\)/);
    expect(svc).toMatch(/ACTION_PLAY\.equals\(action\)[\s\S]*emitAction\("play"\)/);
    expect(svc).toMatch(/ACTION_NEXT\.equals\(action\)[\s\S]*emitAction\("next"\)/);
    expect(svc).toMatch(/ACTION_STOP\.equals\(action\)[\s\S]*shutdown\(\)/);
  });

  it('JS -> service: word, meaning, playing flag and index reach the service', () => {
    expect(plugin).toContain('call.getString("title")');
    expect(plugin).toContain('call.getBoolean("playing", true)');
    expect(plugin).toContain('PlaybackService.applyState(');
    expect(svc).toContain('static void applyState(');
  });

  it('a paused player keeps the card (wake lock released) and the service stays restartable', () => {
    expect(svc).toMatch(/if \(playing && running\) acquireWakeLock\(\); else releaseWakeLock\(\)/);
    expect(svc).toContain('START_STICKY');
  });
});

describe('[FB-49][FB-53] JS side', () => {
  beforeEach(() => vi.resetModules());

  it('hook and bridge are never driven by visibility/pagehide, and pause keeps the card', () => {
    const hook = read('src/hooks/usePlaybackService.ts');
    expect(hook).not.toMatch(/visibilitychange|pagehide|blur/);
    expect(hook).toContain('playing: false');
    expect(read('src/services/background/playbackService.ts')).toMatch(/action === 'play'\) handlers\?\.onPlay/);
  });

  it('web Media Session API (browser only) mirrors metadata and handlers in addition to the native session', async () => {
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
