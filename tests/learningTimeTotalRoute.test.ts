/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import handler from '@/server/learningTime';

interface Req {
  method: string;
  url?: string;
  headers?: Record<string, unknown>;
  on(event: string, cb: (chunk: string) => void): void;
}

interface Res {
  statusCode: number;
  headers: Record<string, string>;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

describe('learning time total route', () => {
  beforeEach(() => {
    localStorage.setItem(
      'learningTime_learner1',
      JSON.stringify({
        '2024-01-01': 60 * 60 * 1000,
        '2024-01-02': 30 * 60 * 1000,
      })
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns cumulative hours for learner', async () => {
    const req: Req = {
      method: 'GET',
      url: '/api/learning-time/total/learner1',
      headers: {},
      on: () => {},
    };
    let body = '';
    const res: Res = {
      statusCode: 0,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      end(str = '') {
        body = str;
      },
    };

    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json');
    const data = JSON.parse(body);
    expect(data.totalHours).toBeCloseTo(1.5);
  });
});
