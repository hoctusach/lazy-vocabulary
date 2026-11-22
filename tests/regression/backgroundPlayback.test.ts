import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
const J = 'android/app/src/main/java/com/lazy/vocabulary/';

// Real screen-off playback on a device is manual (proxy): these assert the wiring that makes it possible.
describe('[FB-31] background / screen-off playback wiring', () => {
  const svc = read(J + 'PlaybackService.java');
  const act = read(J + 'MainActivity.java');

  it('service is restartable (START_STICKY) and never returns START_NOT_STICKY for start/update', () => {
    expect(svc).toContain('START_STICKY');
    // the only NOT_STICKY returns are explicit stop/shutdown/orphan paths
    const startPath = svc.slice(svc.indexOf('running = true;'), svc.indexOf('ensureMediaSession()', svc.indexOf('running = true;')));
    expect(startPath).toContain('return START_STICKY');
  });

  it('an orphan restart (process died, no plugin/WebView) shuts down instead of showing a dead notification', () => {
    expect(svc).toMatch(/intent == null && !PlaybackServicePlugin\.isLoaded\(\)/);
    expect(read(J + 'PlaybackServicePlugin.java')).toContain('static boolean isLoaded()');
  });

  it('an active MediaSession in PLAYING state backs the foreground notification (MediaStyle)', () => {
    expect(svc).toContain('new MediaSession(');
    expect(svc).toContain('STATE_PLAYING');
    expect(svc).toContain('setActive(true)');
    expect(svc).toContain('Notification.MediaStyle');
    expect(svc).toContain('setMediaSession(');
  });

  it('manifest keeps the mediaPlayback foreground service and wake lock', () => {
    const m = read('android/app/src/main/AndroidManifest.xml');
    expect(m).toMatch(/<service[^>]*android:name="\.PlaybackService"[^>]*android:foregroundServiceType="mediaPlayback"/s);
    expect(m).toContain('android.permission.WAKE_LOCK');
  });

  it('MainActivity re-resumes the WebView after onPause/onStop and with a periodic heartbeat while backgrounded', () => {
    expect(act).toMatch(/onPause\(\)[\s\S]*keepWebViewRunningIfPlaying\(\)[\s\S]*startHeartbeat\(\)/);
    expect(act).toMatch(/onStop\(\)[\s\S]*keepWebViewRunningIfPlaying\(\)/);
    expect(act).toContain('resumeTimers()');
    expect(act).toContain('postDelayed');
    expect(act).toMatch(/onResume\(\)[\s\S]*stopHeartbeat\(\)/);
  });

  it('no JS page-hide / visibility handler stops speech or the playback service (FB-01/FB-31)', () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) { if (n !== '__tests__') walk(p); }
        else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) files.push(p);
      }
    };
    walk(join(process.cwd(), 'src'));
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // handler bodies registered for hide/background events must not stop playback
      const re = /addEventListener\(\s*['"](visibilitychange|pagehide|blur)['"]\s*,\s*([A-Za-z_]+|\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\})/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const body = m[2].startsWith('(') ? m[2] : (src.match(new RegExp(`(?:const|function)\\s+${m[2]}[\\s\\S]*?\\n\\s{0,4}\\}`)) ?? [''])[0];
        if (/speechSynthesis\.cancel|unifiedSpeechController\.stop|stopPlaybackService|stopSpeechForUserIntent/.test(body)) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the service is started from isPlaying only (hasData && !isPaused && word), not from visibility', () => {
    const c = read('src/components/vocabulary-app/VocabularyAppContainerNew.tsx');
    expect(c).toContain('isPlaying: hasData && !isPaused && !!currentWord');
    expect(read('src/hooks/usePlaybackService.ts')).not.toMatch(/visibilitychange|pagehide/);
  });
});
