/**
 * @vitest-environment jsdom
 *
 * REGRESSION GUARD: auto-play voice must never stop because of a bottom-tab switch or a tab
 * mounting/unmounting. See src/services/speech/stopSpeechForUserIntent.ts.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const mounts = vi.hoisted(() => ({ mount: 0, unmount: 0 }));
const stops = vi.hoisted(() => ({
  controllerStop: vi.fn(),
  stopService: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn(),
}));

vi.mock('@/services/speech/unifiedSpeechController', () => ({
  unifiedSpeechController: { stop: stops.controllerStop },
}));
vi.mock('@/services/background/playbackService', () => ({ stopPlaybackService: stops.stopService }));
vi.mock('@/components/VocabularyAppWithLearning', () => ({
  default: ({ view }: { view: string }) => {
    React.useEffect(() => {
      if (view !== 'learn') return undefined;
      mounts.mount++;
      return () => {
        mounts.unmount++;
      };
    }, [view]);
    return <div data-testid={`view-${view}`} />;
  },
}));
vi.mock('@/features/word-sets/VocabularySetContext', () => ({
  VocabularySetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useVocabularySets: () => ({ activeSet: { name: 'Set' } }),
}));
vi.mock('@/features/word-sets/VocabularySetsScreen', () => ({ default: () => <div>sets-screen</div> }));
vi.mock('@/components/mobile/MorePanel', () => ({ default: () => <div>more-panel</div> }));
vi.mock('@/components/UserGreeting', () => ({ default: () => null }));
vi.mock('@/components/ThemeSwitcher', () => ({ default: () => null }));
vi.mock('@/components/NotificationManager', () => ({ default: () => null }));
vi.mock('@/components/ThemeMascot', () => ({ default: () => null }));
vi.mock('@/hooks/useDailyReminder', () => ({ useDailyReminder: () => {} }));
vi.mock('@/hooks/useBannerAds', () => ({ useBannerAds: () => {} }));
vi.mock('@/components/mobile/useIsDesktop', () => ({ useIsDesktop: () => false }));

import Index from '@/pages/Index';
import { stopSpeechForUserIntent } from '@/services/speech/stopSpeechForUserIntent';

beforeEach(() => {
  vi.clearAllMocks();
  mounts.mount = 0;
  mounts.unmount = 0;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel: stops.cancel } });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const go = (name: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }));

describe('tab switching never stops speech', () => {
  it('keeps the Learn player mounted and calls no stop/cancel through every tab round trip', () => {
    render(<Index />);
    expect(mounts.mount).toBe(1);
    for (const t of ['Progress', 'Sets', 'More', 'Learn', 'Sets', 'Learn', 'Progress', 'More', 'Progress', 'Learn']) {
      act(() => go(t));
      expect(stops.controllerStop).not.toHaveBeenCalled();
      expect(stops.cancel).not.toHaveBeenCalled();
      expect(stops.stopService).not.toHaveBeenCalled();
    }
    expect(mounts.mount).toBe(1);
    expect(mounts.unmount).toBe(0);
  });

  it('only hides the Learn host off-tab', () => {
    render(<Index />);
    const host = screen.getByTestId('learn-host');
    expect(host.hidden).toBe(false);
    act(() => go('More'));
    expect(host.hidden).toBe(true);
    expect(screen.getByTestId('view-learn')).toBeTruthy();
    act(() => go('Learn'));
    expect(host.hidden).toBe(false);
  });
});

describe('stop is reserved for user intent', () => {
  it('stopSpeechForUserIntent is the explicit stop path', () => {
    stopSpeechForUserIntent('user-pause');
    expect(stops.controllerStop).toHaveBeenCalledTimes(1);
  });

  const root = path.resolve(__dirname, '..');
  const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

  it('tab shell / tab hooks contain no direct speech or service stop calls', () => {
    const files = ['src/pages/Index.tsx', ...fs.readdirSync(path.join(root, 'src/components/mobile')).map((f) => `src/components/mobile/${f}`)];
    for (const f of files) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(src, f).not.toMatch(/speechSynthesis|unifiedSpeechController|stopPlaybackService|stopSpeechForUserIntent/);
    }
  });

  it('the Learn controller unmount cleanup does not stop speech', () => {
    const src = read('src/hooks/vocabulary-controller/useUnifiedVocabularyController.ts');
    const block = src.slice(src.indexOf('Cleanup on unmount'), src.indexOf('return {', src.indexOf('Cleanup on unmount')));
    expect(block).toContain('clearAutoAdvanceTimer');
    expect(block).not.toMatch(/\.stop\(|cancel\(/);
  });
});
