import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
const svc = read('android/app/src/main/java/com/lazy/vocabulary/PlaybackService.java');

// Look of the lock-screen / shade card on a real phone is proxy/manual (catalog); this asserts the wiring.
describe('[FB-53] natural app notification', () => {
  it('uses androidx NotificationCompat.BigTextStyle and never MediaStyle or a MediaSession token', () => {
    expect(svc).toContain('androidx.core.app.NotificationCompat');
    expect(svc).toContain('new NotificationCompat.BigTextStyle()');
    expect(svc).not.toMatch(/MediaStyle|MediaSession|setShowActionsInCompactView/);
  });

  it('public on the lock screen, ongoing while playing, silent, alert once', () => {
    expect(svc).toContain('VISIBILITY_PUBLIC');
    expect(svc).toContain('.setOngoing(playing)');
    expect(svc).toContain('.setOnlyAlertOnce(true)');
    expect(svc).toContain('.setSilent(true)');
    expect(svc).toContain('.setSmallIcon(');
  });

  it('[FB-53][FB-65] title = word, text = meaning, expanded = category, meaning, example, translation (card order)', () => {
    expect(svc).toContain('.setContentTitle(title)');
    expect(svc).toContain('.setContentText(text)');
    const big = svc.slice(svc.indexOf('private CharSequence bigText()'), svc.indexOf('private Notification buildNotification()'));
    for (const f of ['it.categoryLabel', 'it.meaning', 'it.example', 'it.translation']) expect(big).toContain(f);
    expect(big.indexOf('it.meaning')).toBeLessThan(big.indexOf('it.example'));
    expect(big.indexOf('it.example')).toBeLessThan(big.indexOf('it.translation'));
  });

  it('[FB-73] Pause/Play toggle and Next actions go to the service (foreground-service PendingIntent, works when locked)', () => {
    expect(svc).toMatch(/addAction\([^)]*"Pause", servicePi\(ACTION_PAUSE/);
    expect(svc).toMatch(/addAction\([^)]*"Play", servicePi\(ACTION_PLAY/);
    expect(svc).toMatch(/addAction\([^)]*"Next", servicePi\(ACTION_NEXT/);
    expect(svc).not.toMatch(/"Stop"/);
    expect(svc).toContain('PendingIntent.getForegroundService');
  });

  it('swipe-away (delete intent / task removed) stops the service cleanly', () => {
    expect(svc).toContain('.setDeleteIntent(servicePi(ACTION_DISMISS');
    expect(svc).toMatch(/onTaskRemoved[\s\S]*shutdown\(\)/);
  });
});
