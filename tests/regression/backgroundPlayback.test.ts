import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
const J = 'android/app/src/main/java/com/lazy/vocabulary/';

// Real screen-off playback on a device is manual (proxy): these assert the wiring that makes it possible.
describe('[FB-31][FB-52] background / screen-off playback wiring', () => {
  const svc = read(J + 'PlaybackService.java');
  const act = read(J + 'MainActivity.java');

  it('service is restartable (START_STICKY) and never returns START_NOT_STICKY for start/update', () => {
    expect(svc).toContain('START_STICKY');
    // the only NOT_STICKY returns are explicit stop/shutdown/orphan paths
    const startPath = svc.slice(svc.indexOf('running = true;'), svc.indexOf('return START_STICKY', svc.indexOf('running = true;')) + 20);
    expect(startPath).toContain('return START_STICKY');
  });

  it('an orphan restart (process died, no plugin/WebView) shuts down instead of showing a dead notification', () => {
    expect(svc).toMatch(/intent == null && !PlaybackServicePlugin\.isLoaded\(\)/);
    expect(read(J + 'PlaybackServicePlugin.java')).toContain('static boolean isLoaded()');
  });

  it('[FB-53] the notification is NOT a MediaStyle / MediaSession widget', () => {
    expect(svc).not.toContain('MediaStyle');
    expect(svc).not.toContain('MediaSession');
    expect(svc).toContain('BigTextStyle');
  });

  it('manifest keeps the mediaPlayback foreground service and wake lock', () => {
    const m = read('android/app/src/main/AndroidManifest.xml');
    expect(m).toMatch(/<service[^>]*android:name="\.PlaybackService"[^>]*android:foregroundServiceType="mediaPlayback"/s);
    expect(m).toContain('android.permission.WAKE_LOCK');
  });

  it('[FB-52] MainActivity no longer fights Chromium with WebView timer hacks; it hands over to the native queue', () => {
    expect(act).not.toContain('resumeTimers');
    expect(act).not.toContain('keepWebViewRunningIfPlaying');
    expect(act).not.toContain('heartbeat');
    expect(act).toMatch(/onPause\(\)[\s\S]*PlaybackService\.takeOver\(\)/);
    expect(act).toMatch(/onResume\(\)[\s\S]*PlaybackService\.handBack\(\)/);
    expect(act).toContain('KokoroEngine.trim'); // unchanged
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
