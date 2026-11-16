import { describe, it, expect, vi, beforeEach } from 'vitest';

const plugin = vi.hoisted(() => ({
  start: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  requestNotificationPermission: vi.fn().mockResolvedValue({ granted: false }),
  addListener: vi.fn(),
}));
const platform = vi.hoisted(() => ({ native: true, name: 'android' }));
let actionCb: ((e: { action: 'pause' | 'next' }) => void) | undefined;

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native, getPlatform: () => platform.name },
  registerPlugin: () => plugin,
}));

import {
  startPlaybackService, updatePlaybackService, stopPlaybackService,
  setPlaybackHandlers, __resetPlaybackServiceForTests,
} from '../playbackService';

beforeEach(() => {
  vi.clearAllMocks();
  __resetPlaybackServiceForTests();
  platform.native = true; platform.name = 'android';
  plugin.addListener.mockImplementation(async (_e: string, cb: typeof actionCb) => { actionCb = cb; return { remove: vi.fn() }; });
});

describe('playbackService', () => {
  it('starts on play and asks notification permission only once (denied is fine)', async () => {
    await startPlaybackService({ title: 'run', text: 'chạy' });
    expect(plugin.requestNotificationPermission).toHaveBeenCalledTimes(1);
    expect(plugin.start).toHaveBeenCalledWith({ title: 'run', text: 'chạy' });
    await startPlaybackService({ title: 'walk', text: 'đi' });
    expect(plugin.requestNotificationPermission).toHaveBeenCalledTimes(1);
    expect(plugin.start).toHaveBeenCalledTimes(1);
  });

  it('updates on word change while running', async () => {
    await startPlaybackService({ title: 'a', text: '1' });
    await startPlaybackService({ title: 'b', text: '2' });
    await updatePlaybackService({ title: 'c', text: '3' });
    expect(plugin.update).toHaveBeenNthCalledWith(1, { title: 'b', text: '2' });
    expect(plugin.update).toHaveBeenNthCalledWith(2, { title: 'c', text: '3' });
  });

  it('stops on pause and never updates after stop', async () => {
    await startPlaybackService({ title: 'a', text: '' });
    await stopPlaybackService();
    expect(plugin.stop).toHaveBeenCalledTimes(1);
    await updatePlaybackService({ title: 'b', text: '' });
    expect(plugin.update).not.toHaveBeenCalled();
    await stopPlaybackService();
    expect(plugin.stop).toHaveBeenCalledTimes(1);
  });

  it('maps notification actions to handlers', async () => {
    const onPause = vi.fn(); const onNext = vi.fn();
    setPlaybackHandlers({ onPause, onNext });
    await startPlaybackService({ title: 'a', text: '' });
    actionCb!({ action: 'pause' });
    actionCb!({ action: 'next' });
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('is a no-op on web and on non-android native', async () => {
    platform.native = false;
    await startPlaybackService({ title: 'a', text: '' });
    await stopPlaybackService();
    platform.native = true; platform.name = 'ios';
    await startPlaybackService({ title: 'a', text: '' });
    expect(plugin.start).not.toHaveBeenCalled();
    expect(plugin.requestNotificationPermission).not.toHaveBeenCalled();
  });

  it('survives plugin failure', async () => {
    plugin.start.mockRejectedValueOnce(new Error('boom'));
    await expect(startPlaybackService({ title: 'a', text: '' })).resolves.toBeUndefined();
    await startPlaybackService({ title: 'a', text: '' });
    expect(plugin.start).toHaveBeenCalledTimes(2);
  });
});
