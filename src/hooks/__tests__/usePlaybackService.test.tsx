// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  startPlaybackService: vi.fn().mockResolvedValue(undefined),
  stopPlaybackService: vi.fn().mockResolvedValue(undefined),
  setPlaybackHandlers: vi.fn(),
}));
vi.mock('@/services/background/playbackService', () => svc);

import { usePlaybackService } from '../usePlaybackService';

const base = { onPause: vi.fn(), onNext: vi.fn() };
beforeEach(() => vi.clearAllMocks());

describe('[FB-16] usePlaybackService', () => {
  it('starts on play, updates on word change, stops on pause', () => {
    const { rerender } = renderHook((p) => usePlaybackService(p), {
      initialProps: { ...base, isPlaying: true, word: 'a', detail: 'x' },
    });
    expect(svc.startPlaybackService).toHaveBeenLastCalledWith({ title: 'a', text: 'x' });
    rerender({ ...base, isPlaying: true, word: 'b', detail: 'y' });
    expect(svc.startPlaybackService).toHaveBeenLastCalledWith({ title: 'b', text: 'y' });
    rerender({ ...base, isPlaying: false, word: 'b', detail: 'y' });
    expect(svc.stopPlaybackService).toHaveBeenCalled();
  });

  it('stops on unmount and routes actions to latest handlers', () => {
    const { unmount } = renderHook(() => usePlaybackService({ ...base, isPlaying: true, word: 'a' }));
    const h = svc.setPlaybackHandlers.mock.calls[0][0];
    h.onPause(); h.onNext();
    expect(base.onPause).toHaveBeenCalled();
    expect(base.onNext).toHaveBeenCalled();
    svc.stopPlaybackService.mockClear();
    unmount();
    expect(svc.stopPlaybackService).toHaveBeenCalled();
  });

  it('does not stop when the page becomes hidden (background play)', () => {
    renderHook(() => usePlaybackService({ ...base, isPlaying: true, word: 'a' }));
    svc.stopPlaybackService.mockClear();
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(svc.stopPlaybackService).not.toHaveBeenCalled();
  });
});
