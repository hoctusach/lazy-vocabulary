import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_SET_NAME } from '@/features/word-sets/types';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const STRINGS = 'android/app/src/main/res/values/strings.xml';

describe('[FB-05] app name is "Lazy Vocabulary" everywhere the OS shows it', () => {
  it('Android strings, Capacitor config and iOS display name', () => {
    const strings = read(STRINGS);
    expect(strings).toMatch(/<string name="app_name">Lazy Vocabulary<\/string>/);
    expect(strings).toMatch(/<string name="title_activity_main">Lazy Vocabulary<\/string>/);
    expect(read('capacitor.config.ts')).toMatch(/appName:\s*['"]Lazy Vocabulary['"]/);
    expect(read('ios/App/App/Info.plist')).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>Lazy Vocabulary<\/string>/);
  });
  it('the old "C1 C2 Audio" name is gone from those files and the manifest', () => {
    for (const f of [STRINGS, MANIFEST, 'capacitor.config.ts', 'ios/App/App/Info.plist']) {
      expect(read(f), f).not.toContain('C1 C2 Audio');
    }
  });
});

describe('[FB-16] background playback keeps its Android foreground-service wiring', () => {
  it('manifest declares PlaybackService as a mediaPlayback foreground service with its permissions', () => {
    const m = read(MANIFEST);
    expect(m).toMatch(/<service[^>]*android:name="\.PlaybackService"[^>]*android:foregroundServiceType="mediaPlayback"/s);
    expect(m).toContain('android.permission.FOREGROUND_SERVICE"');
    expect(m).toContain('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK');
  });
  it('MainActivity registers the PlaybackService plugin and the JS side talks to the same name', () => {
    expect(read('android/app/src/main/java/com/lazy/vocabulary/MainActivity.java')).toContain('registerPlugin(PlaybackServicePlugin.class)');
    expect(read('src/services/background/playbackService.ts')).toContain("registerPlugin<PlaybackServicePlugin>('PlaybackService')");
  });
});

describe('[FB-27] no microphone permission on Android', () => {
  it('AndroidManifest does not declare RECORD_AUDIO', () => {
    expect(read(MANIFEST)).not.toContain('RECORD_AUDIO');
  });
});

describe('[FB-24] built-in set label', () => {
  it('is "Word Set: C1, C2", not "Default"', () => {
    expect(DEFAULT_SET_NAME).toBe('Word Set: C1, C2');
    expect(DEFAULT_SET_NAME).not.toMatch(/^default$/i);
  });
});
