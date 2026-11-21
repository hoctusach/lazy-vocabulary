/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  stopPlaybackService: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/services/background/playbackService', () => svc);
vi.mock('@/hooks/useVoiceContext', () => ({
  useVoiceContext: () => ({ allVoices: [], selectedVoiceName: '', setSelectedVoiceName: vi.fn() }),
}));

import { usePauseOnLeaveLearn } from '@/components/mobile/usePauseOnLeaveLearn';
import { readPreferencesFromStorage, writePreferencesToStorage } from '@/lib/preferences/localPreferences';
import { useVocabularyState } from '@/hooks/vocabulary-controller/core/useVocabularyState';
import type { AppTab } from '@/components/mobile/BottomTabBar';

const cancel = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel } });
  writePreferencesToStorage({ is_playing: true });
});

describe('usePauseOnLeaveLearn', () => {
  it.each(['progress', 'sets', 'more'] as AppTab[])(
    'leaving Learn for %s cancels speech, stops the service and persists paused',
    async (next) => {
      const { rerender } = renderHook(({ tab }) => usePauseOnLeaveLearn(tab), {
        initialProps: { tab: 'learn' as AppTab },
      });
      expect(cancel).not.toHaveBeenCalled();
      expect(readPreferencesFromStorage().is_playing).toBe(true);

      rerender({ tab: next });
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(svc.stopPlaybackService).toHaveBeenCalledTimes(1);
      expect(readPreferencesFromStorage().is_playing).toBe(false);
    },
  );

  it('does nothing for non-Learn tab moves, on mount, or when returning to Learn', () => {
    const { rerender } = renderHook(({ tab }) => usePauseOnLeaveLearn(tab), {
      initialProps: { tab: 'sets' as AppTab },
    });
    rerender({ tab: 'more' });
    rerender({ tab: 'learn' });
    expect(cancel).not.toHaveBeenCalled();
    expect(svc.stopPlaybackService).not.toHaveBeenCalled();
    expect(readPreferencesFromStorage().is_playing).toBe(true);
  });

  it('returning to Learn starts paused and is not overwritten by the unmounting player', () => {
    const tabHook = renderHook(({ tab }) => usePauseOnLeaveLearn(tab), {
      initialProps: { tab: 'learn' as AppTab },
    });
    const player = renderHook(() => useVocabularyState());
    expect(player.result.current.isPaused).toBe(false);

    tabHook.rerender({ tab: 'progress' });
    player.unmount();
    expect(readPreferencesFromStorage().is_playing).toBe(false);

    tabHook.rerender({ tab: 'learn' });
    const returned = renderHook(() => useVocabularyState());
    expect(returned.result.current.isPaused).toBe(true);
  });

  it('background events (visibilitychange / hidden / blur) do not pause or stop anything', () => {
    renderHook(() => usePauseOnLeaveLearn('learn'));
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(cancel).not.toHaveBeenCalled();
    expect(svc.stopPlaybackService).not.toHaveBeenCalled();
    expect(readPreferencesFromStorage().is_playing).toBe(true);
  });
});
