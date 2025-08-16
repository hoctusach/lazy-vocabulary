/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { learningTimeService } from '@/services/learningTimeService';

const learnerId = 'learner1';

describe('learningTimeService sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    localStorage.clear();
  });

  it('stores duration locally and posts to API', async () => {
    learningTimeService.startSession(learnerId);
    // advance time by 5 minutes
    vi.setSystemTime(new Date('2024-01-01T00:05:00Z'));
    const duration = learningTimeService.stopSession(learnerId);
    expect(duration).toBe(5 * 60 * 1000);

    const stored = JSON.parse(localStorage.getItem('learningTime_' + learnerId) || '{}');
    expect(stored['2024-01-01']).toBe(5 * 60 * 1000);

    expect(fetch).toHaveBeenCalledTimes(2);
    const mockFetch = fetch as unknown as vi.Mock;
    const [, postCall] = mockFetch.mock.calls;
    const [url, options] = postCall;
    expect(url).toBe('/api/learning-time');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ learnerId, date: '2024-01-01', duration: 5 * 60 * 1000 });
  });
});

