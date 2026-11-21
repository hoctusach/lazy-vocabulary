import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ header: {} as Record<string, string> }));

vi.mock('@/lib/auth', () => ({ getAuthHeader: vi.fn(() => mocks.header) }));
vi.mock('@/lib/db/supabase', () => ({ resolveSupabaseConfig: vi.fn(() => ({ url: 'http://x.test', anon: 'eyJanon' })) }));

import { authorizedFetch } from '@/lib/supabaseClient';

describe('authorizedFetch', () => {
  const fetchMock = vi.fn(async () => new Response('[]'));
  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const sentHeaders = () => new Headers((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers);

  it('adds X-Session-Token and leaves the anon Authorization untouched', async () => {
    mocks.header = { Authorization: 'bearer opaque-session-token' };
    await authorizedFetch('http://x.test/rest/v1/rpc/list_friends', {
      headers: { Authorization: 'Bearer eyJanon.jwt.sig', apikey: 'eyJanon' },
    });
    const h = sentHeaders();
    expect(h.get('x-session-token')).toBe('opaque-session-token');
    expect(h.get('authorization')).toBe('Bearer eyJanon.jwt.sig');
    expect(h.get('apikey')).toBe('eyJanon');
  });

  it('sends no session header when there is no live session', async () => {
    mocks.header = {};
    await authorizedFetch('http://x.test/rest/v1/rpc/list_friends', { headers: { Authorization: 'Bearer eyJanon.jwt.sig' } });
    const h = sentHeaders();
    expect(h.has('x-session-token')).toBe(false);
    expect(h.get('authorization')).toBe('Bearer eyJanon.jwt.sig');
  });
});
