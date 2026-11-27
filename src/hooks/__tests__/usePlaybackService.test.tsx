// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  startPlaybackService: vi.fn().mockResolvedValue(undefined),
  stopPlaybackService: vi.fn().mockResolvedValue(undefined),
  setPlaybackHandlers: vi.fn(),
  updatePlaybackService: vi.fn().mockResolvedValue(undefined),
  setPlaybackQueue: vi.fn().mockResolvedValue(undefined),
  isPlaybackServiceRunning: vi.fn().mockReturnValue(true),
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
    expect(svc.startPlaybackService).toHaveBeenLastCalledWith({ title: 'a', text: 'x', playing: true });
    rerender({ ...base, isPlaying: true, word: 'b', detail: 'y' });
    expect(svc.startPlaybackService).toHaveBeenLastCalledWith({ title: 'b', text: 'y', playing: true });
    rerender({ ...base, isPlaying: false, word: 'b', detail: 'y' });
    expect(svc.stopPlaybackService).toHaveBeenCalled();
  });

  it('[FB-49] paused with a word: keeps the card (update playing:false) instead of stopping; Play handler routes', () => {
    const onPlay = vi.fn();
    const { rerender } = renderHook((p) => usePlaybackService(p), {
      initialProps: { ...base, onPlay, isPlaying: true, active: true, word: 'a', detail: 'x' },
    });
    svc.stopPlaybackService.mockClear();
    rerender({ ...base, onPlay, isPlaying: false, active: true, word: 'a', detail: 'x' });
    expect(svc.updatePlaybackService).toHaveBeenLastCalledWith({ title: 'a', text: 'x', playing: false });
    expect(svc.stopPlaybackService).not.toHaveBeenCalled();
    svc.setPlaybackHandlers.mock.calls[0][0].onPlay();
    expect(onPlay).toHaveBeenCalled();
    rerender({ ...base, onPlay, isPlaying: true, active: true, word: 'a', detail: 'x' });
    expect(svc.startPlaybackService).toHaveBeenLastCalledWith({ title: 'a', text: 'x', playing: true });
  });

  it('[FB-52] pushes the queue to the native service (once per queue change, index travels with the word)', () => {
    const queue = { items: [{ word: 'a' }, { word: 'b' }], index: 0, engine: 'system' as const };
    const { rerender } = renderHook((p) => usePlaybackService(p), {
      initialProps: { ...base, isPlaying: true, word: 'a', detail: 'x', queue, index: 0 },
    });
    expect(svc.setPlaybackQueue).toHaveBeenCalledTimes(1);
    expect(svc.setPlaybackQueue).toHaveBeenLastCalledWith({ ...queue, index: 0 });
    rerender({ ...base, isPlaying: true, word: 'b', detail: 'y', queue, index: 1 });
    expect(svc.setPlaybackQueue).toHaveBeenCalledTimes(1);
    expect(svc.startPlaybackService).toHaveBeenLastCalledWith({ title: 'b', text: 'y', playing: true, index: 1 });
  });

  it('[FB-52] native hand-back sync reaches onNativeSync', () => {
    const onNativeSync = vi.fn();
    renderHook(() => usePlaybackService({ ...base, isPlaying: true, word: 'a', onNativeSync }));
    const h = svc.setPlaybackHandlers.mock.calls[0][0];
    h.onNativeState({ index: 3, playing: true, native: true, sync: false });
    expect(onNativeSync).not.toHaveBeenCalled();
    h.onNativeState({ index: 3, playing: true, native: false, sync: true });
    expect(onNativeSync).toHaveBeenCalledWith(3);
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
