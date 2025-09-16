import { describe, it, expect, vi, afterEach } from 'vitest';

import { fetchLatestMessage } from '@/lovable';
import type { LovableBroadcastDisabledInfo, LovableBroadcastFailureContext } from '@/lovable';

interface MockResponse {
  status: number;
  json: ReturnType<typeof vi.fn>;
}

const createResponse = (status: number, body: unknown = {}): MockResponse => ({
  status,
  json: vi.fn().mockResolvedValue(body)
});

describe('fetchLatestMessage', () => {
  const originalBroadcast = globalThis.BroadcastChannel;

  afterEach(() => {
    globalThis.BroadcastChannel = originalBroadcast;
    vi.restoreAllMocks();
  });

  it('retries on HTTP errors until the request succeeds', async () => {
    const first = createResponse(502);
    const second = createResponse(503);
    const successBody = { message: 'ok' };
    const third = createResponse(200, successBody);

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, Promise<MockResponse>>()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
      .mockResolvedValueOnce(third);

    const toastSpy = vi.fn();
    const warnSpy = vi.fn();
    const errorSpy = vi.fn();

    const result = await fetchLatestMessage('project-1', {
      retries: 3,
      retryDelayMs: () => 0,
      fetchImplementation: fetchMock as unknown as typeof fetch,
      toastFn: toastSpy,
      logger: { warn: warnSpy, error: errorSpy },
      broadcast: false
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(toastSpy).not.toHaveBeenCalled();
    expect(result).toEqual(successBody);
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns null after exhausting retries', async () => {
    const failure = createResponse(500);
    const fetchMock = vi.fn<Parameters<typeof fetch>, Promise<MockResponse>>().mockResolvedValue(failure);
    const toastSpy = vi.fn();
    const warnSpy = vi.fn();
    const errorSpy = vi.fn();

    const result = await fetchLatestMessage('project-2', {
      retries: 1,
      retryDelayMs: () => 0,
      fetchImplementation: fetchMock as unknown as typeof fetch,
      toastFn: toastSpy,
      toastOnHttpError: false,
      logger: { warn: warnSpy, error: errorSpy },
      broadcast: false
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toBeNull();
    expect(toastSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Failed to load latest message:', expect.anything());
  });

  it('allows the broadcast to be disabled after repeated failures', async () => {
    const channelName = `test-broadcast-${Date.now()}-${Math.random()}`;

    class ThrowingBroadcastChannel {
      static instances: ThrowingBroadcastChannel[] = [];
      public readonly name: string;
      public readonly postMessage = vi.fn(() => {
        throw new Error('broadcast failure');
      });
      public readonly close = vi.fn();
      constructor(name: string) {
        this.name = name;
        ThrowingBroadcastChannel.instances.push(this);
      }
      addEventListener() {}
      removeEventListener() {}
    }

    globalThis.BroadcastChannel = ThrowingBroadcastChannel as unknown as typeof BroadcastChannel;

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, Promise<MockResponse>>()
      .mockResolvedValue({ status: 200, json: vi.fn().mockResolvedValue({ ok: true }) });

    const disabledEvents: LovableBroadcastDisabledInfo[] = [];
    const warnSpy = vi.fn();
    const errorSpy = vi.fn();

    const onFailure = vi.fn((_: unknown, context: LovableBroadcastFailureContext) => {
      if (context.failureCount >= 2) {
        context.disable();
      }
    });

    const options = {
      retries: 0,
      retryDelayMs: () => 0,
      fetchImplementation: fetchMock as unknown as typeof fetch,
      toastOnHttpError: false,
      logger: { warn: warnSpy, error: errorSpy },
      broadcast: {
        channelName,
        maxConsecutiveFailures: 5,
        onFailure,
        onDisabled: (info: LovableBroadcastDisabledInfo) => disabledEvents.push(info),
        logger: { warn: warnSpy, error: errorSpy }
      }
    } as const;

    await fetchLatestMessage('project-3', options);
    await fetchLatestMessage('project-3', options);

    const channelInstance = ThrowingBroadcastChannel.instances[0];
    expect(channelInstance).toBeDefined();
    expect(channelInstance.postMessage).toHaveBeenCalledTimes(2);
    expect(channelInstance.close).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledTimes(2);
    expect(disabledEvents).toHaveLength(1);
    expect(disabledEvents[0]?.reason).toBe('manual');

    const callsAfterDisable = channelInstance.postMessage.mock.calls.length;

    await fetchLatestMessage('project-3', options);

    expect(channelInstance.postMessage).toHaveBeenCalledTimes(callsAfterDisable);
  });
});
